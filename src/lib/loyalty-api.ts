import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import {
  stampProgress,
  type ClubMember,
  type LoyaltyEvent,
  type LoyaltyProfile,
} from "@/lib/loyalty";
import { kitchenMiddleware, managerMiddleware } from "@/lib/staff-middleware";
import { displayPhone, normalizePhone, phoneDigits } from "@/lib/phone";
import type { Order, OrderLine } from "@/lib/types";

function num(v: unknown): number {
  if (typeof v === "number") return v;
  const n = parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
}

function asJson<T>(v: unknown, fallback: T): T {
  if (v == null) return fallback;
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as T;
    } catch {
      return fallback;
    }
  }
  return v as T;
}

type Sql = Awaited<ReturnType<typeof getSql>>;

type ProfileRow = {
  display_name: string;
  loyalty_opted_in: boolean;
  stamps_balance: unknown;
  phone: string | null;
};

type EventRow = {
  id: number;
  kind: string;
  points: unknown;
  note: string;
  created_at: string;
};

async function loadAuthUser(sql: Sql, userId: string) {
  const rows = await sql<{ name: string; email: string | null }>`
    select "name" as name, "email" as email from "user" where "id" = ${userId}
  `;
  return rows[0] ?? { name: "", email: null };
}

async function ensureProfile(sql: Sql, userId: string, fallbackName: string) {
  await sql`
    insert into customer_profiles (user_id, display_name, loyalty_opted_in, loyalty_opted_in_at)
    values (${userId}, ${fallbackName}, true, now())
    on conflict (user_id) do nothing
  `;
}

async function readProfile(sql: Sql, userId: string): Promise<LoyaltyProfile> {
  const authUser = await loadAuthUser(sql, userId);
  await ensureProfile(sql, userId, authUser.name || "");
  const rows = await sql<ProfileRow>`
    select display_name, loyalty_opted_in, stamps_balance, phone
    from customer_profiles where user_id = ${userId}
  `;
  const row = rows[0];
  const stamps = num(row?.stamps_balance);
  const progress = stampProgress(stamps);
  const events = await sql<EventRow>`
    select id, kind, points, note, created_at
    from loyalty_events
    where user_id = ${userId}
    order by created_at desc
    limit 20
  `;
  const mapped: LoyaltyEvent[] = events.map((e) => ({
    id: e.id,
    kind: e.kind,
    points: num(e.points),
    note: e.note,
    at: Date.parse(e.created_at) || Date.now(),
  }));
  return {
    displayName: (row?.display_name || authUser.name || "").trim(),
    email: authUser.email,
    phone: row?.phone ? displayPhone(row.phone) : null,
    optedIn: !!row?.loyalty_opted_in,
    stamps: progress.stamps,
    card: progress.card,
    canRedeem: progress.canRedeem,
    remainingToReward: progress.remainingToReward,
    rewardsReady: progress.rewardsReady,
    events: mapped,
  };
}

export const getLoyaltyProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<LoyaltyProfile> => {
    const sql = await getSql();
    return readProfile(sql, context.userId);
  });

export const setLoyaltyOptIn = createServerFn({ method: "POST" })
  .validator((input: { optedIn: boolean; displayName?: string }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<LoyaltyProfile> => {
    const sql = await getSql();
    const authUser = await loadAuthUser(sql, context.userId);
    await ensureProfile(sql, context.userId, authUser.name || "");
    const name = (data.displayName || "").trim().slice(0, 40);
    if (data.optedIn) {
      await sql`
        update customer_profiles
        set loyalty_opted_in = true,
            loyalty_opted_in_at = coalesce(loyalty_opted_in_at, now()),
            display_name = case when ${name} = '' then display_name else ${name} end
        where user_id = ${context.userId}
      `;
      await sql`
        insert into loyalty_events (user_id, kind, points, note)
        values (${context.userId}, 'opt_in', 0, 'Joined the Butty Club')
      `;
    } else {
      await sql`
        update customer_profiles
        set loyalty_opted_in = false
        where user_id = ${context.userId}
      `;
      await sql`
        insert into loyalty_events (user_id, kind, points, note)
        values (${context.userId}, 'opt_out', 0, 'Paused Butty Club stamps')
      `;
    }
    return readProfile(sql, context.userId);
  });

export const saveTicketName = createServerFn({ method: "POST" })
  .validator((input: { displayName: string }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const name = data.displayName.trim().slice(0, 40);
    await ensureProfile(sql, context.userId, name);
    if (name) {
      await sql`
        update customer_profiles
        set display_name = ${name}
        where user_id = ${context.userId}
      `;
    }
    return { ok: true as const };
  });

type OrderRow = {
  id: string;
  order_no: unknown;
  ticket_name: string;
  collect_time: string;
  stage: unknown;
  collected: boolean;
  collected_at: string | null;
  paid: boolean;
  created_at: string;
  points_earned: unknown;
  discount_gbp: unknown;
};

type LineRow = {
  order_id: string;
  item_id: string | null;
  name: string;
  qty: unknown;
  unit_price: unknown;
  line_price: unknown;
  mods: unknown;
};

export const getMyOrders = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Order[]> => {
    const sql = await getSql();
    const orderRows = await sql<OrderRow>`
      select id, order_no, ticket_name, collect_time, stage, collected,
             collected_at, paid, created_at, points_earned, discount_gbp
      from orders
      where user_id = ${context.userId} and paid = true
      order by created_at desc
      limit 40
    `;
    const ids = orderRows.map((o) => o.id);
    let lineRows: LineRow[] = [];
    if (ids.length > 0) {
      const ph = ids.map((_, i) => `$${i + 1}`).join(",");
      lineRows = await sql.query<LineRow>(
        `select order_id, item_id, name, qty, unit_price, line_price, mods
         from order_lines where order_id in (${ph})`,
        ids,
      );
    }
    const linesByOrder = new Map<string, LineRow[]>();
    for (const l of lineRows) {
      const arr = linesByOrder.get(l.order_id) ?? [];
      arr.push(l);
      linesByOrder.set(l.order_id, arr);
    }
    return orderRows.map((o) => {
      const lines: OrderLine[] = (linesByOrder.get(o.id) ?? []).map((l) => ({
        itemId: l.item_id || "",
        name: l.name,
        qty: num(l.qty) || 1,
        unit: num(l.unit_price),
        linePrice: num(l.line_price),
        mods: asJson<string[]>(l.mods, []),
      }));
      return {
        id: o.id,
        no: num(o.order_no),
        name: o.ticket_name,
        collectTime: o.collect_time,
        stage: num(o.stage),
        collected: !!o.collected,
        collectedAt: o.collected_at ? Date.parse(o.collected_at) : undefined,
        contact: null,
        at: Date.parse(o.created_at) || Date.now(),
        lines,
        pointsEarned: num(o.points_earned),
        discountGbp: num(o.discount_gbp),
      };
    });
  });

type MemberRow = {
  user_id: string;
  display_name: string;
  stamps_balance: unknown;
  loyalty_opted_in: boolean;
  phone: string | null;
  email: string | null;
  auth_name: string | null;
};

function toMember(r: MemberRow): ClubMember {
  const progress = stampProgress(num(r.stamps_balance));
  return {
    userId: r.user_id,
    displayName: (r.display_name || r.auth_name || "Guest").trim(),
    email: r.email,
    phone: r.phone ? displayPhone(r.phone) : null,
    stamps: progress.stamps,
    card: progress.card,
    canRedeem: progress.canRedeem,
    optedIn: !!r.loyalty_opted_in,
  };
}

/** If this phone belongs to a walk-in till card, fold those stamps into the app account. */
async function claimPhone(sql: Sql, userId: string, phone: string) {
  const taken = await sql<{ user_id: string; stamps_balance: unknown }>`
    select user_id, stamps_balance from customer_profiles
    where phone = ${phone} and user_id <> ${userId}
    limit 1
  `;
  const other = taken[0];
  if (!other) {
    await sql`
      update customer_profiles
      set phone = ${phone}
      where user_id = ${userId}
    `;
    return;
  }
  if (!other.user_id.startsWith("walkin:")) {
    throw new Error("That number is already on a club card.");
  }
  const walkinId = other.user_id;
  const extra = num(other.stamps_balance);
  await sql`update customer_profiles set phone = '' where user_id = ${walkinId}`;
  await sql`
    update customer_profiles
    set phone = ${phone},
        loyalty_opted_in = true,
        loyalty_opted_in_at = coalesce(loyalty_opted_in_at, now()),
        stamps_balance = stamps_balance + ${extra}
    where user_id = ${userId}
  `;
  await sql`update loyalty_events set user_id = ${userId} where user_id = ${walkinId}`;
  await sql`update orders set user_id = ${userId} where user_id = ${walkinId}`;
  await sql`delete from customer_profiles where user_id = ${walkinId}`;
  await sql`
    insert into loyalty_events (user_id, kind, points, note)
    values (
      ${userId},
      'adjust',
      ${extra},
      ${
        extra > 0
          ? `Merged ${extra} stamp${extra === 1 ? "" : "s"} from the counter card`
          : "Merged counter club card"
      }
    )
  `;
}

export const listClubMembers = createServerFn({ method: "POST" })
  .middleware([kitchenMiddleware])
  .validator((input: { q?: string }) => input)
  .handler(async ({ data }): Promise<ClubMember[]> => {
    const sql = await getSql();
    const q = (data.q || "").trim();
    const like = `%${q}%`;
    const digits = phoneDigits(q);
    const digitLike = digits ? `%${digits}%` : "";
    const rows = q
      ? await sql<MemberRow>`
          select p.user_id, p.display_name, p.stamps_balance, p.loyalty_opted_in,
                 p.phone, u.email as email, u.name as auth_name
          from customer_profiles p
          left join "user" u on u.id = p.user_id
          where p.display_name ilike ${like}
             or coalesce(u.email, '') ilike ${like}
             or coalesce(u.name, '') ilike ${like}
             or coalesce(p.phone, '') ilike ${like}
             or (${digits} <> '' and coalesce(p.phone, '') like ${digitLike})
          order by p.display_name asc
          limit 40
        `
      : await sql<MemberRow>`
          select p.user_id, p.display_name, p.stamps_balance, p.loyalty_opted_in,
                 p.phone, u.email as email, u.name as auth_name
          from customer_profiles p
          left join "user" u on u.id = p.user_id
          order by p.created_at desc, p.display_name asc
          limit 40
        `;
    return rows.map(toMember);
  });

export const findClubMember = createServerFn({ method: "POST" })
  .middleware([kitchenMiddleware])
  .validator((input: { q: string }) => input)
  .handler(async ({ data }): Promise<ClubMember[]> => {
    const q = (data.q || "").trim();
    if (q.length < 2) return [];
    const sql = await getSql();
    const like = `%${q}%`;
    const phone = normalizePhone(q);
    const digits = phoneDigits(q);
    const digitLike = digits.length >= 6 ? `%${digits}%` : "";
    const rows = await sql<MemberRow>`
      select p.user_id, p.display_name, p.stamps_balance, p.loyalty_opted_in,
             p.phone, u.email as email, u.name as auth_name
      from customer_profiles p
      left join "user" u on u.id = p.user_id
      where p.display_name ilike ${like}
         or coalesce(u.email, '') ilike ${like}
         or coalesce(u.name, '') ilike ${like}
         or (${phone} <> '' and p.phone = ${phone})
         or (${digitLike} <> '' and coalesce(p.phone, '') like ${digitLike})
      order by
        case when ${phone} <> '' and p.phone = ${phone} then 0 else 1 end,
        p.display_name asc
      limit 12
    `;
    return rows.map(toMember);
  });

export const enrolWalkInMember = createServerFn({ method: "POST" })
  .middleware([kitchenMiddleware])
  .validator((input: { name: string; phone: string }) => input)
  .handler(async ({ data }): Promise<ClubMember> => {
    const name = (data.name || "").trim().slice(0, 40);
    const phone = normalizePhone(data.phone);
    if (name.length < 2) throw new Error("Need a name for the ticket.");
    if (phone.length < 11) throw new Error("Need a UK mobile number.");
    const sql = await getSql();
    const existing = await sql<MemberRow>`
      select p.user_id, p.display_name, p.stamps_balance, p.loyalty_opted_in,
             p.phone, u.email as email, u.name as auth_name
      from customer_profiles p
      left join "user" u on u.id = p.user_id
      where p.phone = ${phone}
      limit 1
    `;
    if (existing[0]) return toMember(existing[0]);
    const userId = `walkin:${phone}`;
    await sql`
      insert into customer_profiles
        (user_id, display_name, phone, loyalty_opted_in, loyalty_opted_in_at)
      values (${userId}, ${name}, ${phone}, true, now())
    `;
    await sql`
      insert into loyalty_events (user_id, kind, points, note)
      values (${userId}, 'opt_in', 0, 'Joined the Butty Club at the counter')
    `;
    const created = await sql<MemberRow>`
      select p.user_id, p.display_name, p.stamps_balance, p.loyalty_opted_in,
             p.phone, u.email as email, u.name as auth_name
      from customer_profiles p
      left join "user" u on u.id = p.user_id
      where p.user_id = ${userId}
    `;
    return toMember(created[0]!);
  });

export const saveClubPhone = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { phone: string }) => input)
  .handler(async ({ context, data }): Promise<LoyaltyProfile> => {
    const sql = await getSql();
    const authUser = await loadAuthUser(sql, context.userId);
    await ensureProfile(sql, context.userId, authUser.name || "");
    const phone = normalizePhone(data.phone);
    if (phone && phone.length < 11) {
      throw new Error("That doesn't look like a UK mobile.");
    }
    if (phone) {
      await claimPhone(sql, context.userId, phone);
    } else {
      await sql`
        update customer_profiles
        set phone = ''
        where user_id = ${context.userId}
      `;
    }
    return readProfile(sql, context.userId);
  });

export const adjustClubStamps = createServerFn({ method: "POST" })
  .middleware([managerMiddleware])
  .validator(
    (input: { userId: string; delta: number; note?: string }) => input,
  )
  .handler(async ({ data }): Promise<ClubMember> => {
    const userId = data.userId.trim();
    const delta = Math.round(data.delta);
    if (!userId) throw new Error("Pick a club member.");
    if (!delta || Math.abs(delta) > 9) {
      throw new Error("Adjust by 1–9 stamps.");
    }
    const sql = await getSql();
    const note =
      (data.note || "").trim().slice(0, 80) ||
      (delta > 0 ? `Counter added ${delta} stamp${delta === 1 ? "" : "s"}` : `Counter removed ${Math.abs(delta)} stamp${delta === -1 ? "" : "s"}`);
    const updated = await sql<ProfileRow & { user_id: string }>`
      update customer_profiles
      set stamps_balance = greatest(0, stamps_balance + ${delta})
      where user_id = ${userId}
      returning user_id, display_name, loyalty_opted_in, stamps_balance, phone
    `;
    if (!updated[0]) throw new Error("No club member with that account.");
    await sql`
      insert into loyalty_events (user_id, kind, points, note)
      values (${userId}, 'adjust', ${delta}, ${note})
    `;
    const authUser = await loadAuthUser(sql, userId);
    const progress = stampProgress(num(updated[0].stamps_balance));
    return {
      userId,
      displayName: (updated[0].display_name || authUser.name || "Guest").trim(),
      email: authUser.email,
      phone: updated[0].phone ? displayPhone(updated[0].phone) : null,
      stamps: progress.stamps,
      card: progress.card,
      canRedeem: progress.canRedeem,
      optedIn: !!updated[0].loyalty_opted_in,
    };
  });
