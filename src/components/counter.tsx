import { useMemo, useState } from "react";
import {
  Check,
  ChefHat,
  Leaf,
  Minus,
  Plus,
  Search,
  Star,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { Chip, inpStyle, SubHead } from "@/components/bits";
import { cn } from "@/lib/cn";
import {
  enrolWalkInMember,
  findClubMember,
} from "@/lib/loyalty-api";
import { STAMPS_FOR_REWARD, type ClubMember } from "@/lib/loyalty";
import { isSandwichSection, SECTION_ORDER, SECTION_SHORT } from "@/lib/menu";
import { useShop } from "@/lib/store";
import type { MenuItem, OrderLine } from "@/lib/types";

export function Counter() {
  const menu = useShop((s) => s.menu);
  const specialsPaused = useShop((s) => s.specialsPaused);
  const placeCounterOrder = useShop((s) => s.placeCounterOrder);

  const [section, setSection] = useState<string>(SECTION_ORDER[0]);
  const [cart, setCart] = useState<OrderLine[]>([]);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [name, setName] = useState("");
  const [member, setMember] = useState<ClubMember | null>(null);
  const [redeem, setRedeem] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ no: number; name: string } | null>(null);

  const sections = useMemo(() => {
    return SECTION_ORDER.map((s) => ({
      name: s,
      items: menu.filter((i) => i.section === s),
    })).filter((g) => g.items.length);
  }, [menu]);

  const active =
    sections.find((s) => s.name === section)?.items ?? sections[0]?.items ?? [];

  const total = cart.reduce((s, l) => s + l.linePrice, 0);
  const sandwichCount = cart
    .filter((l) => {
      const it = menu.find((m) => m.id === l.itemId);
      return it ? isSandwichSection(it.section) : false;
    })
    .reduce((s, l) => s + l.qty, 0);
  const freeValue =
    redeem && member?.canRedeem && sandwichCount > 0
      ? Math.max(
          0,
          ...cart
            .filter((l) => {
              const it = menu.find((m) => m.id === l.itemId);
              return it ? isSandwichSection(it.section) : false;
            })
            .map((l) => l.unit),
        )
      : 0;
  const payable = Math.max(0, total - freeValue);
  const ticketName = (name.trim() || member?.displayName || "").trim();

  const addLine = (line: OrderLine) => {
    setCart((c) => {
      const i = c.findIndex(
        (x) => x.itemId === line.itemId && x.mods.join() === line.mods.join(),
      );
      if (i < 0) return [...c, line];
      const next = [...c];
      const qty = next[i].qty + line.qty;
      next[i] = {
        ...next[i],
        qty,
        linePrice: Math.round(next[i].unit * qty * 100) / 100,
      };
      return next;
    });
    setEditing(null);
  };

  const tapItem = (it: MenuItem) => {
    if (it.soldOut) return;
    if (it.section === "Lunch Specials" && specialsPaused) return;
    if (it.remove.length || it.extras.length) {
      setEditing(it);
      return;
    }
    addLine({
      itemId: it.id,
      name: it.name,
      mods: [],
      unit: it.price,
      linePrice: it.price,
      qty: 1,
    });
  };

  const bump = (idx: number, d: number) => {
    setCart((c) => {
      const next = [...c];
      const line = next[idx];
      const qty = line.qty + d;
      if (qty <= 0) return next.filter((_, i) => i !== idx);
      next[idx] = {
        ...line,
        qty,
        linePrice: Math.round(line.unit * qty * 100) / 100,
      };
      return next;
    });
  };

  const resetTicket = () => {
    setCart([]);
    setRedeem(false);
    setMember(null);
    setName("");
    setError(null);
    setEditing(null);
  };

  const send = async () => {
    if (cart.length === 0) return;
    if (ticketName.length < 2) {
      setError("Put a name on the ticket.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const no = await placeCounterOrder({
        lines: cart,
        name: ticketName,
        memberUserId: member?.userId,
        redeemReward: redeem && !!member?.canRedeem,
      });
      setSent({ no, name: ticketName });
      resetTicket();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send the ticket.");
    } finally {
      setBusy(false);
    }
  };

  const attachMember = (m: ClubMember) => {
    setMember(m);
    setName((n) => n.trim() || m.displayName);
    setRedeem(false);
  };

  return (
    <div className="md:flex md:h-full md:overflow-hidden">
      <div className="min-w-0 flex-1 overflow-y-auto px-3 py-3 pb-6 md:px-5">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="m-0 font-display text-2xl leading-none">Counter</h1>
              <a
                href="/kitchen"
                className="flex h-9 items-center gap-1.5 rounded-full border-2 border-butty-ink bg-butty-paper px-3 text-xs font-bold text-butty-ink no-underline"
              >
                <ChefHat size={14} /> Kitchen
              </a>
            </div>
            <p className="mt-1.5 mb-0 text-sm text-butty-muted">
              Tap to add. Take payment, then send the ticket.
            </p>
          </div>
        </div>

        {editing ? (
          <Customise
            item={editing}
            onAdd={addLine}
            onBack={() => setEditing(null)}
          />
        ) : (
          <>
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {sections.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => setSection(s.name)}
                  className={cn(
                    "h-12 shrink-0 rounded-full border-2 border-butty-ink px-5 text-base font-bold",
                    section === s.name
                      ? "bg-butty-ink text-butty-cream"
                      : "bg-butty-paper text-butty-ink",
                  )}
                >
                  {SECTION_SHORT[s.name] ?? s.name}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {active.map((it) => {
                const blocked =
                  it.soldOut ||
                  (it.section === "Lunch Specials" && specialsPaused);
                const qty = cart
                  .filter((l) => l.itemId === it.id)
                  .reduce((s, l) => s + l.qty, 0);
                return (
                  <button
                    key={it.id}
                    type="button"
                    disabled={blocked}
                    onClick={() => tapItem(it)}
                    className={cn(
                      "flex min-h-28 items-stretch gap-3 rounded-[20px] border-[3px] border-butty-ink bg-butty-paper p-4 text-left",
                      qty > 0 &&
                        "bg-butty-cream shadow-[4px_4px_0_var(--color-butty-red)]",
                      blocked && "opacity-40",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 text-lg font-bold leading-tight">
                        {it.name}
                        {it.veg && (
                          <Leaf size={16} className="text-butty-green" />
                        )}
                      </div>
                      <div className="mt-2 text-xl font-bold tabular-nums text-butty-red-deep">
                        £{it.price.toFixed(2)}
                      </div>
                    </div>
                    <div
                      className={cn(
                        "grid size-16 shrink-0 self-center place-items-center rounded-[14px] border-[3px] border-butty-ink text-2xl font-bold",
                        blocked ? "bg-butty-disabled" : "bg-butty-yellow",
                      )}
                    >
                      {qty > 0 ? qty : <Plus size={30} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <aside className="flex flex-col border-t-[3px] border-butty-ink bg-butty-paper md:h-full md:w-96 md:shrink-0 md:border-t-0 md:border-l-[3px]">
        <TicketPanel
          cart={cart}
          name={name}
          setName={setName}
          member={member}
          onClearMember={() => {
            setMember(null);
            setRedeem(false);
          }}
          onPickMember={attachMember}
          redeem={redeem}
          setRedeem={setRedeem}
          sandwichCount={sandwichCount}
          payable={payable}
          freeValue={freeValue}
          error={error}
          busy={busy}
          onBump={bump}
          onRemove={(i) => setCart((c) => c.filter((_, j) => j !== i))}
          onSend={() => void send()}
        />
      </aside>

      {sent && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-butty-ink/55 p-4">
          <div className="w-full max-w-sm rounded-[24px] border-[3px] border-butty-ink bg-butty-paper p-6 text-center shadow-[6px_6px_0_var(--color-butty-ink)]">
            <div className="text-sm font-bold tracking-widest text-butty-muted uppercase">
              Sent to kitchen
            </div>
            <div className="mt-2 font-display text-5xl leading-none">
              #{sent.no}
            </div>
            <p className="mt-3 mb-5 text-base font-semibold">{sent.name}</p>
            <button
              type="button"
              onClick={() => setSent(null)}
              className="h-14 w-full rounded-2xl bg-butty-red text-base font-bold text-butty-cream shadow-[0_5px_0_var(--color-butty-red-deep)]"
            >
              Next customer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TicketPanel({
  cart,
  name,
  setName,
  member,
  onClearMember,
  onPickMember,
  redeem,
  setRedeem,
  sandwichCount,
  payable,
  freeValue,
  error,
  busy,
  onBump,
  onRemove,
  onSend,
}: {
  cart: OrderLine[];
  name: string;
  setName: (v: string) => void;
  member: ClubMember | null;
  onClearMember: () => void;
  onPickMember: (m: ClubMember) => void;
  redeem: boolean;
  setRedeem: (v: boolean) => void;
  sandwichCount: number;
  payable: number;
  freeValue: number;
  error: string | null;
  busy: boolean;
  onBump: (idx: number, d: number) => void;
  onRemove: (idx: number) => void;
  onSend: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col p-3 md:p-4">
      <div className="mb-3 text-sm font-bold tracking-widest text-butty-muted uppercase">
        Ticket
      </div>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name on ticket"
        autoComplete="off"
        style={{ ...inpStyle, fontSize: 18, padding: "14px 14px" }}
      />

      <ClubAttach
        member={member}
        defaultName={name}
        onClear={onClearMember}
        onPick={onPickMember}
      />

      {member?.canRedeem && sandwichCount > 0 && (
        <label className="mt-3 flex min-h-12 items-center gap-2.5 rounded-[12px] border-2 border-butty-ink bg-butty-yellow px-3 text-sm font-bold">
          <input
            type="checkbox"
            checked={redeem}
            onChange={(e) => setRedeem(e.target.checked)}
            className="size-5 accent-butty-red"
          />
          Free sandwich (9 stamps)
          {redeem && freeValue > 0 && (
            <span className="ml-auto tabular-nums">−£{freeValue.toFixed(2)}</span>
          )}
        </label>
      )}

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
        {cart.length === 0 ? (
          <div className="rounded-[14px] border-2 border-dashed border-butty-ink px-4 py-8 text-center text-sm font-semibold text-butty-muted">
            Ticket is empty. Tap a sandwich to start.
          </div>
        ) : (
          <div className="grid gap-2">
            {cart.map((l, i) => (
              <div
                key={`${l.itemId}-${i}`}
                className="flex items-center gap-2 rounded-[14px] border-2 border-butty-ink bg-butty-cream px-2 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{l.name}</div>
                  {l.mods.length > 0 && (
                    <div className="truncate text-xs text-butty-muted">
                      {l.mods.join(", ")}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onBump(i, -1)}
                    className="grid size-11 place-items-center rounded-[10px] border-2 border-butty-ink bg-butty-paper"
                    aria-label="Less"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-6 text-center text-base font-bold tabular-nums">
                    {l.qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => onBump(i, 1)}
                    className="grid size-11 place-items-center rounded-[10px] border-2 border-butty-ink bg-butty-yellow"
                    aria-label="More"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="w-14 text-right text-sm font-bold tabular-nums">
                  £{l.linePrice.toFixed(2)}
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  className="grid size-11 place-items-center rounded-[10px] border-2 border-butty-ink bg-butty-paper text-butty-red"
                  aria-label="Remove"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 mb-0 text-sm font-semibold text-butty-red">{error}</p>
      )}

      <button
        type="button"
        disabled={busy || cart.length === 0}
        onClick={onSend}
        className="mt-3 flex h-16 items-center justify-between rounded-2xl bg-butty-red px-4 text-lg font-bold text-butty-cream shadow-[0_5px_0_var(--color-butty-red-deep)] disabled:bg-butty-disabled disabled:shadow-none"
      >
        <span>{busy ? "Sending…" : "Send to kitchen"}</span>
        <span className="tabular-nums">£{payable.toFixed(2)}</span>
      </button>
    </div>
  );
}

function ClubAttach({
  member,
  defaultName,
  onClear,
  onPick,
}: {
  member: ClubMember | null;
  defaultName: string;
  onClear: () => void;
  onPick: (m: ClubMember) => void;
}) {
  const [q, setQ] = useState("");
  const [joinName, setJoinName] = useState("");
  const [joinPhone, setJoinPhone] = useState("");
  const [hits, setHits] = useState<ClubMember[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [join, setJoin] = useState(false);

  const search = async (query = q) => {
    const term = query.trim();
    if (term.length < 2) return;
    setBusy(true);
    setErr(null);
    try {
      const rows = await findClubMember({ data: { q: term } });
      setHits(rows);
      if (rows.length === 1) {
        onPick(rows[0]!);
        setQ("");
        setHits(null);
        setJoin(false);
        return;
      }
      if (rows.length === 0) {
        setJoin(true);
        setJoinPhone(term);
        if (!joinName.trim() && defaultName.trim()) setJoinName(defaultName.trim());
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't search.");
    } finally {
      setBusy(false);
    }
  };

  const startCard = async () => {
    setBusy(true);
    setErr(null);
    try {
      const m = await enrolWalkInMember({
        data: {
          name: joinName.trim() || defaultName.trim() || q.trim(),
          phone: joinPhone.trim() || q.trim(),
        },
      });
      onPick(m);
      setQ("");
      setHits(null);
      setJoin(false);
      setJoinName("");
      setJoinPhone("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't start a card.");
    } finally {
      setBusy(false);
    }
  };

  if (member) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-[14px] border-2 border-butty-ink bg-butty-yellow px-3 py-2.5">
        <Star size={18} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold">{member.displayName}</div>
          <div className="text-xs font-semibold text-butty-ink/70">
            {member.card}/{STAMPS_FOR_REWARD} stamps
            {member.phone ? ` · ${member.phone}` : ""}
            {member.canRedeem ? " · free ready" : ""}
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="grid size-11 place-items-center rounded-[10px] border-2 border-butty-ink bg-butty-paper"
          aria-label="Remove club card"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
      >
        <div className="relative min-w-0 flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-butty-muted"
          />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setHits(null);
            }}
            placeholder="Club mobile or name"
            inputMode="tel"
            autoComplete="off"
            aria-label="Club mobile or name"
            style={{ ...inpStyle, paddingLeft: 36, fontSize: 16 }}
          />
        </div>
        <button
          type="submit"
          disabled={busy || q.trim().length < 2}
          className="h-12 shrink-0 rounded-[10px] border-2 border-butty-ink bg-butty-yellow px-4 text-sm font-bold"
        >
          {busy ? "…" : "Find"}
        </button>
      </form>
      {err && (
        <p className="mt-2 mb-0 text-sm font-semibold text-butty-red">{err}</p>
      )}
      {hits && hits.length > 1 && (
        <div className="mt-2 overflow-hidden rounded-[14px] border-2 border-butty-ink">
          {hits.map((m, i) => (
            <button
              key={m.userId}
              type="button"
              onClick={() => {
                onPick(m);
                setQ("");
                setHits(null);
              }}
              className={cn(
                "flex w-full items-center gap-2 bg-butty-cream px-3 py-3 text-left",
                i > 0 && "border-t-2 border-butty-ink",
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold">{m.displayName}</div>
                <div className="truncate text-xs text-butty-muted">
                  {m.phone || m.email || "No number"} · {m.card}/
                  {STAMPS_FOR_REWARD}
                </div>
              </div>
              {m.canRedeem && (
                <span className="rounded-full bg-butty-red px-2 py-0.5 text-[10px] font-bold text-butty-cream uppercase">
                  Free
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {hits && hits.length === 0 && (
        <p className="mt-2 mb-0 text-sm font-semibold">
          No card on that number. Start one below.
        </p>
      )}
      <button
        type="button"
        onClick={() => {
          setJoin((v) => {
            const next = !v;
            if (next && !joinName.trim() && defaultName.trim()) {
              setJoinName(defaultName.trim());
            }
            return next;
          });
        }}
        className="mt-2 flex min-h-11 items-center gap-2 text-sm font-bold"
      >
        <UserPlus size={16} /> Start a club card
      </button>
      {join && (
        <div className="mt-2 grid gap-2">
          <input
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
            placeholder="Name"
            autoComplete="off"
            style={inpStyle}
          />
          <input
            value={joinPhone}
            onChange={(e) => setJoinPhone(e.target.value)}
            placeholder="Mobile number"
            inputMode="tel"
            autoComplete="off"
            style={inpStyle}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void startCard()}
            className="h-12 rounded-[12px] bg-butty-ink text-sm font-bold text-butty-cream"
          >
            {busy ? "Saving…" : "Join & attach"}
          </button>
        </div>
      )}
    </div>
  );
}

function Customise({
  item,
  onAdd,
  onBack,
}: {
  item: MenuItem;
  onAdd: (line: OrderLine) => void;
  onBack: () => void;
}) {
  const [removed, setRemoved] = useState<string[]>([]);
  const [extras, setExtras] = useState<{ n: string; p: number }[]>([]);
  const extrasTotal = extras.reduce((s, e) => s + e.p, 0);
  const unit = item.price + extrasTotal;
  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-3 h-11 text-sm font-bold underline"
      >
        Back to menu
      </button>
      <h2 className="m-0 font-display text-xl">{item.name}</h2>
      <p className="mt-1 mb-0 text-sm text-butty-muted">{item.desc}</p>
      {item.remove.length > 0 && (
        <>
          <SubHead>Take off</SubHead>
          <div className="flex flex-wrap gap-2">
            {item.remove.map((r) => {
              const off = removed.includes(r);
              return (
                <Chip
                  key={r}
                  on={off}
                  onClick={() =>
                    setRemoved((x) =>
                      off ? x.filter((i) => i !== r) : [...x, r],
                    )
                  }
                >
                  {off ? `No ${r}` : r}
                </Chip>
              );
            })}
          </div>
        </>
      )}
      {item.extras.length > 0 && (
        <>
          <SubHead>Extras</SubHead>
          <div className="grid gap-2">
            {item.extras.map((e) => {
              const on = !!extras.find((i) => i.n === e.n);
              return (
                <button
                  key={e.n}
                  type="button"
                  onClick={() =>
                    setExtras((x) =>
                      on ? x.filter((i) => i.n !== e.n) : [...x, e],
                    )
                  }
                  className={cn(
                    "flex min-h-14 items-center justify-between rounded-xl border-2 border-butty-ink px-3.5 text-base font-bold",
                    on
                      ? "bg-butty-red text-butty-cream"
                      : "bg-butty-paper text-butty-ink",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "grid size-6 place-items-center rounded-md border-2",
                        on ? "border-butty-cream" : "border-butty-ink",
                      )}
                    >
                      {on && <Check size={14} />}
                    </span>
                    {e.n}
                  </span>
                  +£{e.p.toFixed(2)}
                </button>
              );
            })}
          </div>
        </>
      )}
      <button
        type="button"
        onClick={() => {
          const mods: string[] = [];
          removed.forEach((r) => mods.push(`No ${r.toLowerCase()}`));
          extras.forEach((e) => mods.push(`+ ${e.n}`));
          onAdd({
            itemId: item.id,
            name: item.name,
            mods,
            unit,
            linePrice: unit,
            qty: 1,
          });
        }}
        className="mt-5 flex h-16 w-full items-center justify-between rounded-2xl bg-butty-red px-4 text-base font-bold text-butty-cream shadow-[0_5px_0_var(--color-butty-red-deep)]"
      >
        Add to ticket
        <span className="tabular-nums">£{unit.toFixed(2)}</span>
      </button>
    </div>
  );
}
