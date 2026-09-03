import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { STAMPS_FOR_REWARD } from "@/lib/loyalty";
import { isSandwichSection } from "@/lib/menu";
import { optionalAuth } from "@/lib/optional-auth";
import {
  kitchenMiddleware,
  managerMiddleware,
  tillOperatorMiddleware,
} from "@/lib/staff-middleware";
import type { Extra, MenuItem, Order, OrderLine } from "@/lib/types";

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

type MenuRow = {
  id: string;
  section: string;
  name: string;
  description: string;
  price: unknown;
  avail_from: unknown;
  avail_to: unknown;
  sold_out: boolean;
  veg: boolean;
  allergens: unknown;
  removable: unknown;
  extras: unknown;
};

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
  points_earned?: unknown;
  discount_gbp?: unknown;
  source?: string;
  taken_by?: string | null;
  taken_by_name?: string | null;
  voided?: boolean;
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

function rowToItem(r: MenuRow): MenuItem {
  return {
    id: r.id,
    section: r.section,
    name: r.name,
    desc: r.description,
    price: num(r.price),
    from: num(r.avail_from),
    to: num(r.avail_to),
    soldOut: !!r.sold_out,
    veg: !!r.veg,
    allergens: asJson<string[]>(r.allergens, []),
    remove: asJson<string[]>(r.removable, []),
    extras: asJson<Extra[]>(r.extras, []),
  };
}

function rowToOrder(o: OrderRow, lines: LineRow[]): Order {
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
    lines: lines.map((l) => ({
      itemId: l.item_id || "",
      name: l.name,
      qty: num(l.qty) || 1,
      unit: num(l.unit_price),
      linePrice: num(l.line_price),
      mods: asJson<string[]>(l.mods, []),
    })),
    pointsEarned: num(o.points_earned),
    discountGbp: num(o.discount_gbp),
    source: o.source === "counter" ? "counter" : "app",
    takenBy: o.taken_by || null,
    takenByName: o.taken_by_name || null,
    voided: !!o.voided,
  };
}

export type ShopSnapshot = {
  menu: MenuItem[];
  shopOpen: boolean;
  specialsPaused: boolean;
  renovating: boolean;
  orders: Order[];
};

export const getShopSnapshot = createServerFn({ method: "GET" }).handler(
  async (): Promise<ShopSnapshot> => {
    const sql = await getSql();
    const items = await sql<MenuRow>`
      select id, section, name, description, price, avail_from, avail_to,
             sold_out, veg, allergens, removable, extras
      from menu_items
      order by section, sort_order, name
    `;
    const settings = await sql<{
      online_orders: boolean;
      specials_on: boolean;
      renovating: boolean;
    }>`select online_orders, specials_on, renovating from shop_settings where id = 1`;
    const orderRows = await sql<OrderRow>`
      select id, order_no, ticket_name, collect_time, stage, collected,
             collected_at, paid, created_at, points_earned, discount_gbp,
             coalesce(source, 'app') as source,
             taken_by, taken_by_name, coalesce(voided, false) as voided
      from orders
      where paid = true
        and coalesce(voided, false) = false
        and (collected = false or created_at > now() - interval '2 days')
      order by created_at desc
      limit 80
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
    const s = settings[0];
    return {
      menu: items.map(rowToItem),
      shopOpen: s ? !!s.online_orders : true,
      specialsPaused: s ? !s.specials_on : false,
      renovating: s ? !!s.renovating : true,
      orders: orderRows.map((o) => rowToOrder(o, linesByOrder.get(o.id) ?? [])),
    };
  },
);

type PlaceInput = {
  lines: OrderLine[];
  name: string;
  collectTime: string;
  redeemReward?: boolean;
};

export const placeShopOrder = createServerFn({ method: "POST" })
  .middleware([optionalAuth])
  .validator((input: PlaceInput) => input)
  .handler(async ({ data, context }): Promise<Order> => {
    const sql = await getSql();
    const lines = Array.isArray(data.lines) ? data.lines : [];
    if (lines.length === 0) throw new Error("Empty order");
    const ticket = (data.name || "Guest").trim().slice(0, 40) || "Guest";
    const collectTime = (data.collectTime || "asap").slice(0, 24);
    const userId = context.userId;

    const flags = await sql<{ online_orders: boolean; renovating: boolean }>`
      select online_orders, renovating from shop_settings where id = 1
    `;
    if (flags[0]?.renovating) {
      throw new Error("Opening soon — orders will be back when we open.");
    }
    if (flags[0] && !flags[0].online_orders) {
      throw new Error("Online orders are paused — try the counter.");
    }

    const ids = [...new Set(lines.map((l) => l.itemId).filter(Boolean))];
    if (ids.length === 0) throw new Error("Empty order");
    const ph = ids.map((_, i) => `$${i + 1}`).join(",");
    const items = await sql.query<MenuRow>(
      `select id, name, price, extras, sold_out, section from menu_items where id in (${ph})`,
      ids,
    );
    const byId = new Map(items.map((i) => [i.id, i]));

    const priced = lines.map((l) => {
      const item = byId.get(l.itemId);
      if (!item) throw new Error(`Unknown item ${l.itemId}`);
      if (item.sold_out) throw new Error(`${item.name} is sold out`);
      const extras = asJson<Extra[]>(item.extras, []);
      let unit = num(item.price);
      const mods = Array.isArray(l.mods) ? l.mods : [];
      for (const m of mods) {
        if (m.startsWith("+ ")) {
          const ex = extras.find((e) => `+ ${e.n}` === m);
          if (ex) unit += num(ex.p);
        }
      }
      const qty = Math.max(1, Math.min(20, Math.round(num(l.qty) || 1)));
      return {
        itemId: item.id,
        name: item.name,
        qty,
        unit,
        linePrice: Math.round(unit * qty * 100) / 100,
        mods,
      };
    });

    const subtotal = priced.reduce((s, l) => s + l.linePrice, 0);
    let discount = 0;
    let redeemed = false;
    let sandwichQty = 0;
    for (const l of priced) {
      const item = byId.get(l.itemId);
      if (item && isSandwichSection(item.section)) sandwichQty += l.qty;
    }

    if (data.redeemReward && userId && sandwichQty > 0) {
      const taken = await sql<{ user_id: string }>`
        update customer_profiles
        set stamps_balance = stamps_balance - ${STAMPS_FOR_REWARD}
        where user_id = ${userId}
          and loyalty_opted_in = true
          and stamps_balance >= ${STAMPS_FOR_REWARD}
        returning user_id
      `;
      if (taken.length > 0) {
        let best = 0;
        for (const l of priced) {
          const item = byId.get(l.itemId);
          if (item && isSandwichSection(item.section)) {
            best = Math.max(best, l.unit);
          }
        }
        discount = best;
        redeemed = true;
      }
    }

    const amount = Math.round((subtotal - discount) * 100) / 100;
    let earned = 0;

    const maxRows = await sql<{ n: unknown }>`
      select coalesce(max(order_no), 346) as n from orders
    `;
    let no = Math.round(num(maxRows[0]?.n)) + 1;
    if (no > 999) no = 100;
    const id = crypto.randomUUID();

    try {
      if (userId) {
        const club = await sql<{ loyalty_opted_in: boolean }>`
          select loyalty_opted_in from customer_profiles where user_id = ${userId}
        `;
        if (club[0]?.loyalty_opted_in) {
          earned = Math.max(0, sandwichQty - (redeemed ? 1 : 0));
        }
      }

      await sql`
        insert into orders
          (id, order_no, ticket_name, collect_time, stage, paid, amount_total,
           user_id, points_earned, discount_gbp)
        values
          (${id}, ${no}, ${ticket}, ${collectTime}, 0, true, ${amount},
           ${userId}, ${earned}, ${discount})
      `;
      for (const l of priced) {
        await sql.query(
          `insert into order_lines (order_id, item_id, name, qty, unit_price, line_price, mods)
           values ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
          [
            id,
            l.itemId,
            l.name,
            l.qty,
            l.unit,
            l.linePrice,
            JSON.stringify(l.mods),
          ],
        );
      }

      if (userId && redeemed) {
        await sql`
          insert into loyalty_events (user_id, kind, points, order_id, note)
          values (
            ${userId}, 'redeem', ${-STAMPS_FOR_REWARD}, ${id},
            ${`Redeemed a free sandwich on #${no}`}
          )
        `;
      }
      if (userId && earned > 0) {
        await sql`
          update customer_profiles
          set stamps_balance = stamps_balance + ${earned}
          where user_id = ${userId} and loyalty_opted_in = true
        `;
        await sql`
          insert into loyalty_events (user_id, kind, points, order_id, note)
          values (
            ${userId}, 'earn', ${earned}, ${id},
            ${`+${earned} stamp${earned === 1 ? "" : "s"} on order #${no}`}
          )
        `;
      }
    } catch (err) {
      if (redeemed && userId) {
        await sql`
          update customer_profiles
          set stamps_balance = stamps_balance + ${STAMPS_FOR_REWARD}
          where user_id = ${userId}
        `;
      }
      throw err;
    }

    const created = await sql<OrderRow>`
      select id, order_no, ticket_name, collect_time, stage, collected,
             collected_at, paid, created_at, points_earned, discount_gbp
      from orders where id = ${id}
    `;
    const createdLines = await sql<LineRow>`
      select order_id, item_id, name, qty, unit_price, line_price, mods
      from order_lines where order_id = ${id}
    `;
    return rowToOrder(created[0]!, createdLines);
  });

export const placeCounterOrder = createServerFn({ method: "POST" })
  .middleware([tillOperatorMiddleware])
  .validator(
    (input: {
      lines: OrderLine[];
      name: string;
      memberUserId?: string | null;
      redeemReward?: boolean;
    }) => input,
  )
  .handler(async ({ data, context }): Promise<Order> => {
    const sql = await getSql();
    const lines = Array.isArray(data.lines) ? data.lines : [];
    if (lines.length === 0) throw new Error("Empty order");
    const ticket = (data.name || "Walk-in").trim().slice(0, 40) || "Walk-in";
    const userId = (data.memberUserId || "").trim() || undefined;

    if (userId) {
      const club = await sql<{ user_id: string; loyalty_opted_in: boolean }>`
        select user_id, loyalty_opted_in from customer_profiles
        where user_id = ${userId}
      `;
      if (!club[0]) throw new Error("That club card wasn't found.");
    }

    const ids = [...new Set(lines.map((l) => l.itemId).filter(Boolean))];
    if (ids.length === 0) throw new Error("Empty order");
    const ph = ids.map((_, i) => `$${i + 1}`).join(",");
    const items = await sql.query<MenuRow>(
      `select id, name, price, extras, sold_out, section from menu_items where id in (${ph})`,
      ids,
    );
    const byId = new Map(items.map((i) => [i.id, i]));

    const priced = lines.map((l) => {
      const item = byId.get(l.itemId);
      if (!item) throw new Error(`Unknown item ${l.itemId}`);
      if (item.sold_out) throw new Error(`${item.name} is sold out`);
      const extras = asJson<Extra[]>(item.extras, []);
      let unit = num(item.price);
      const mods = Array.isArray(l.mods) ? l.mods : [];
      for (const m of mods) {
        if (m.startsWith("+ ")) {
          const ex = extras.find((e) => `+ ${e.n}` === m);
          if (ex) unit += num(ex.p);
        }
      }
      const qty = Math.max(1, Math.min(20, Math.round(num(l.qty) || 1)));
      return {
        itemId: item.id,
        name: item.name,
        qty,
        unit,
        linePrice: Math.round(unit * qty * 100) / 100,
        mods,
      };
    });

    const subtotal = priced.reduce((s, l) => s + l.linePrice, 0);
    let discount = 0;
    let redeemed = false;
    let sandwichQty = 0;
    for (const l of priced) {
      const item = byId.get(l.itemId);
      if (item && isSandwichSection(item.section)) sandwichQty += l.qty;
    }

    if (data.redeemReward && userId && sandwichQty > 0) {
      const taken = await sql<{ user_id: string }>`
        update customer_profiles
        set stamps_balance = stamps_balance - ${STAMPS_FOR_REWARD}
        where user_id = ${userId}
          and loyalty_opted_in = true
          and stamps_balance >= ${STAMPS_FOR_REWARD}
        returning user_id
      `;
      if (taken.length > 0) {
        let best = 0;
        for (const l of priced) {
          const item = byId.get(l.itemId);
          if (item && isSandwichSection(item.section)) {
            best = Math.max(best, l.unit);
          }
        }
        discount = best;
        redeemed = true;
      }
    }

    const amount = Math.round((subtotal - discount) * 100) / 100;
    let earned = 0;

    const maxRows = await sql<{ n: unknown }>`
      select coalesce(max(order_no), 346) as n from orders
    `;
    let no = Math.round(num(maxRows[0]?.n)) + 1;
    if (no > 999) no = 100;
    const id = crypto.randomUUID();

    try {
      if (userId) {
        const club = await sql<{ loyalty_opted_in: boolean }>`
          select loyalty_opted_in from customer_profiles where user_id = ${userId}
        `;
        if (club[0]?.loyalty_opted_in) {
          earned = Math.max(0, sandwichQty - (redeemed ? 1 : 0));
        }
      }

      await sql`
        insert into orders
          (id, order_no, ticket_name, collect_time, stage, paid, amount_total,
           user_id, points_earned, discount_gbp, source, taken_by, taken_by_name)
        values
          (${id}, ${no}, ${ticket}, ${"now"}, 0, true, ${amount},
           ${userId ?? null}, ${earned}, ${discount}, ${"counter"},
           ${context.employeeId}, ${context.employeeName || null})
      `;
      for (const l of priced) {
        await sql.query(
          `insert into order_lines (order_id, item_id, name, qty, unit_price, line_price, mods)
           values ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
          [
            id,
            l.itemId,
            l.name,
            l.qty,
            l.unit,
            l.linePrice,
            JSON.stringify(l.mods),
          ],
        );
      }

      if (userId && redeemed) {
        await sql`
          insert into loyalty_events (user_id, kind, points, order_id, note)
          values (
            ${userId}, 'redeem', ${-STAMPS_FOR_REWARD}, ${id},
            ${`Redeemed a free sandwich on #${no} (counter)`}
          )
        `;
      }
      if (userId && earned > 0) {
        await sql`
          update customer_profiles
          set stamps_balance = stamps_balance + ${earned}
          where user_id = ${userId} and loyalty_opted_in = true
        `;
        await sql`
          insert into loyalty_events (user_id, kind, points, order_id, note)
          values (
            ${userId}, 'earn', ${earned}, ${id},
            ${`+${earned} stamp${earned === 1 ? "" : "s"} on order #${no} (counter)`}
          )
        `;
      }
    } catch (err) {
      if (redeemed && userId) {
        await sql`
          update customer_profiles
          set stamps_balance = stamps_balance + ${STAMPS_FOR_REWARD}
          where user_id = ${userId}
        `;
      }
      throw err;
    }

    const created = await sql<OrderRow>`
      select id, order_no, ticket_name, collect_time, stage, collected,
             collected_at, paid, created_at, points_earned, discount_gbp,
             coalesce(source, 'app') as source,
             taken_by, taken_by_name, coalesce(voided, false) as voided
      from orders where id = ${id}
    `;
    const createdLines = await sql<LineRow>`
      select order_id, item_id, name, qty, unit_price, line_price, mods
      from order_lines where order_id = ${id}
    `;
    return rowToOrder(created[0]!, createdLines);
  });

export const setOrderStage = createServerFn({ method: "POST" })
  .middleware([kitchenMiddleware])
  .validator((input: { no: number; stage: number }) => input)
  .handler(async ({ data }) => {
    const stage = Math.max(0, Math.min(3, Math.round(data.stage)));
    const sql = await getSql();
    await sql`update orders set stage = ${stage} where order_no = ${data.no} and collected = false and coalesce(voided, false) = false`;
    return { ok: true };
  });

export const markOrderCollected = createServerFn({ method: "POST" })
  .middleware([kitchenMiddleware])
  .validator((input: { no: number }) => input)
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql`
      update orders
      set collected = true, collected_at = now(), stage = 3
      where order_no = ${data.no} and coalesce(voided, false) = false
    `;
    return { ok: true };
  });

export const toggleSoldOut = createServerFn({ method: "POST" })
  .middleware([managerMiddleware])
  .validator((input: { id: string; soldOut: boolean }) => input)
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql`update menu_items set sold_out = ${data.soldOut} where id = ${data.id}`;
    return { ok: true };
  });

export const setShopFlags = createServerFn({ method: "POST" })
  .middleware([managerMiddleware])
  .validator((input: {
    shopOpen?: boolean;
    specialsPaused?: boolean;
    renovating?: boolean;
  }) => input)
  .handler(async ({ data }) => {
    const sql = await getSql();
    if (typeof data.shopOpen === "boolean") {
      await sql`update shop_settings set online_orders = ${data.shopOpen}, updated_at = now() where id = 1`;
    }
    if (typeof data.specialsPaused === "boolean") {
      await sql`update shop_settings set specials_on = ${!data.specialsPaused}, updated_at = now() where id = 1`;
    }
    if (typeof data.renovating === "boolean") {
      await sql`update shop_settings set renovating = ${data.renovating}, updated_at = now() where id = 1`;
    }
    return { ok: true };
  });

export const upsertMenuItem = createServerFn({ method: "POST" })
  .middleware([managerMiddleware])
  .validator((input: MenuItem) => input)
  .handler(async ({ data }) => {
    const item = data;
    const id = (item.id || "n" + Date.now()).slice(0, 40);
    const sql = await getSql();
    await sql.query(
      `insert into menu_items
         (id, section, name, description, price, avail_from, avail_to,
          sold_out, veg, allergens, removable, extras, sort_order)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12::jsonb,100)
       on conflict (id) do update set
         section = excluded.section,
         name = excluded.name,
         description = excluded.description,
         price = excluded.price,
         avail_from = excluded.avail_from,
         avail_to = excluded.avail_to,
         sold_out = excluded.sold_out,
         veg = excluded.veg,
         allergens = excluded.allergens,
         removable = excluded.removable,
         extras = excluded.extras`,
      [
        id,
        item.section,
        item.name.trim().slice(0, 80),
        (item.desc || "").slice(0, 240),
        num(item.price),
        num(item.from),
        num(item.to),
        !!item.soldOut,
        !!item.veg,
        JSON.stringify(item.allergens || []),
        JSON.stringify(item.remove || []),
        JSON.stringify(item.extras || []),
      ],
    );
    return { ok: true };
  });

export const deleteMenuItem = createServerFn({ method: "POST" })
  .middleware([managerMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql`delete from menu_items where id = ${data.id}`;
    return { ok: true };
  });

export const voidCounterOrder = createServerFn({ method: "POST" })
  .middleware([tillOperatorMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    if (context.tillRole !== "manager") {
      throw new Error("A manager has to void a ticket.");
    }
    const sql = await getSql();
    const updated = await sql<{ id: string }>`
      update orders
      set voided = true, voided_at = now(), voided_by = ${context.employeeId}
      where id = ${data.id}
        and collected = false
        and coalesce(voided, false) = false
      returning id
    `;
    if (!updated[0]) throw new Error("That ticket can't be voided.");
    return { ok: true as const };
  });
