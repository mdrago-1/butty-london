import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  Check,
  Clock,
  Leaf,
  Minus,
  Plus,
  User,
  X,
} from "lucide-react";
import { AccountScreen } from "@/components/account";
import { Chip, inpStyle, PrimaryButton, QtyBtn, ScreenHead, SubHead } from "@/components/bits";
import { FindUs } from "@/components/find-us";
import { Logo } from "@/components/logo";
import { MenuPhoto } from "@/components/menu-photo";
import { Privacy } from "@/components/privacy";
import { TestPay } from "@/components/test-pay";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/cn";
import { buildSlots, fmtHour, londonHour } from "@/lib/format";
import { CLOSE, isSandwichSection, SECTION_NOTES, SECTION_ORDER, SECTION_SHORT, sectionAnchor } from "@/lib/menu";
import { STAMPS_FOR_REWARD } from "@/lib/loyalty";
import { STAGE_BG, STAGE_TEXT, STAGES } from "@/lib/stages";
import { useShop } from "@/lib/store";
import type { MenuItem, Order, OrderLine, ReorderNote } from "@/lib/types";
import { localBusinessJsonLd } from "@/lib/venue";

type View =
  | "menu"
  | "customise"
  | "checkout"
  | "tracking"
  | "account"
  | "paying"
  | "privacy";

export function Customer() {
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const menu = useShop((s) => s.menu);
  const hour = londonHour();
  const shopOpen = useShop((s) => s.shopOpen);
  const renovating = useShop((s) => s.renovating);
  const specialsPaused = useShop((s) => s.specialsPaused);
  const orders = useShop((s) => s.orders);
  const mine = useShop((s) => s.mine);
  const loyalty = useShop((s) => s.loyalty);
  const myOrderNo = useShop((s) => s.myOrderNo);
  const myOrderNos = useShop((s) => s.myOrderNos);
  const setMyOrderNo = useShop((s) => s.setMyOrderNo);
  const placeOrder = useShop((s) => s.placeOrder);
  const refreshAccount = useShop((s) => s.refreshAccount);
  const setClubOptIn = useShop((s) => s.setClubOptIn);
  const saveName = useShop((s) => s.saveName);

  const myOrder = orders.find((o) => o.no === myOrderNo);
  const [cart, setCart] = useState<OrderLine[]>([]);
  const [view, setView] = useState<View>(myOrder ? "tracking" : "menu");
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [collectTime, setCollectTime] = useState("asap");
  const [name, setName] = useState("");
  const [redeemReward, setRedeemReward] = useState(false);
  const [reorderNote, setReorderNote] = useState<ReorderNote | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [privacyFrom, setPrivacyFrom] = useState<View>("menu");

  useEffect(() => {
    if (!isPending && user) void refreshAccount();
  }, [user, isPending, refreshAccount]);

  useEffect(() => {
    if (name) return;
    const n = loyalty?.displayName || user?.displayName || "";
    if (n) setName(n.split(" ")[0] || n);
  }, [loyalty?.displayName, user, name]);

  const takingOrders = shopOpen && !renovating;
  const isOpenNow = takingOrders && hour >= 8 && hour < CLOSE;

  const myHistory = useMemo(() => {
    if (user) return mine;
    const nos = new Set(myOrderNos);
    return orders.filter((o) => nos.has(o.no));
  }, [user, mine, orders, myOrderNos]);

  const sections = useMemo(() => {
    const map: Record<string, MenuItem[]> = {};
    menu.forEach((it) => {
      (map[it.section] ||= []).push(it);
    });
    return SECTION_ORDER.filter((s) => map[s]).map((s) => ({
      name: s,
      note: SECTION_NOTES[s],
      items: map[s],
    }));
  }, [menu]);

  const sectionState = (items: MenuItem[]) => {
    const it = items[0];
    if (!it) return { open: false, label: "—" };
    if (it.section === "Lunch Specials" && specialsPaused)
      return { open: false, label: "Paused" };
    if (hour < it.from) return { open: false, label: `From ${fmtHour(it.from)}` };
    if (hour >= it.to) return { open: false, label: `Until ${fmtHour(it.to)}` };
    return { open: true, label: null as string | null };
  };

  const lineUnavailable = (line: OrderLine) => {
    const item = menu.find((m) => m.id === line.itemId);
    if (!item) return "no longer on the menu";
    if (item.soldOut) return "sold out";
    if (!takingOrders) return renovating ? "opening soon" : "online orders paused";
    if (item.section === "Lunch Specials" && specialsPaused)
      return "specials paused";
    if (hour < item.from) return `available from ${fmtHour(item.from)}`;
    if (hour >= item.to) return `only until ${fmtHour(item.to)}`;
    return null;
  };

  const openCustomise = (item: MenuItem) => {
    setEditing(item);
    setView("customise");
  };
  const addLine = (line: OrderLine) => {
    setCart((c) => [...c, line]);
    setView("menu");
    setEditing(null);
  };
  const removeLine = (i: number) =>
    setCart((c) => c.filter((_, idx) => idx !== i));
  const total = cart.reduce((s, l) => s + l.linePrice, 0);
  const freeSandwich = useMemo(() => {
    let best = 0;
    for (const l of cart) {
      const item = menu.find((m) => m.id === l.itemId);
      if (item && isSandwichSection(item.section)) best = Math.max(best, l.unit);
    }
    return best;
  }, [cart, menu]);
  const sandwichInCart = freeSandwich > 0;
  const payable =
    redeemReward && loyalty?.canRedeem && sandwichInCart
      ? Math.max(0, Math.round((total - freeSandwich) * 100) / 100)
      : total;

  const reorder = (order: Order) => {
    const ok: OrderLine[] = [];
    const dropped: { name: string; reason: string }[] = [];
    order.lines.forEach((l) => {
      const reason = lineUnavailable(l);
      if (reason) dropped.push({ name: l.name, reason });
      else ok.push({ ...l });
    });
    if (ok.length) setCart((c) => [...c, ...ok]);
    setReorderNote({ ok: ok.map((l) => l.name), dropped });
    setView("menu");
  };

  const doPlace = () => {
    setPayError(null);
    setView("paying");
  };

  const pendingRef = useRef({ cart, name, collectTime, redeemReward });
  pendingRef.current = { cart, name, collectTime, redeemReward };

  const finishPay = useCallback(async () => {
    const p = pendingRef.current;
    await placeOrder({
      lines: p.cart,
      name: p.name || "Guest",
      collectTime: p.collectTime,
      contact: null,
      redeemReward: p.redeemReward,
    });
    setView("tracking");
    setCart([]);
    setRedeemReward(false);
    setReorderNote(null);
    setPayError(null);
  }, [placeOrder]);

  const reset = () => {
    setView("menu");
    setCollectTime("asap");
    setMyOrderNo(null);
  };
  const backToMenu = () => setView("menu");
  const openAccount = () => {
    if (isPending) return;
    if (!user) navigate({ to: "/login" });
    else setView("account");
  };

  const showTracking = view === "tracking" && myOrder;
  const bannerOrder = myOrder && !myOrder.collected ? myOrder : null;
  const usual = myHistory.find((o) => o.no !== myOrderNo) || null;
  const accountLabel = isPending
    ? null
    : user
      ? (loyalty?.displayName || user.displayName || "Account").split(" ")[0]
      : "Sign in";

  const menuProps = {
    sections,
    sectionState,
    isOpenNow,
    shopOpen: takingOrders,
    renovating,
    cart,
    openCustomise,
    total,
    goCheckout: () => setView("checkout"),
    myOrder: bannerOrder,
    viewMyOrder: () => setView("tracking"),
    accountLabel,
    clubStamps: loyalty?.optedIn ? loyalty.card : null,
    openAccount,
    usual,
    reorder,
    reorderNote,
    clearReorderNote: () => setReorderNote(null),
    openPrivacy: () => {
      setPrivacyFrom("menu");
      setView("privacy");
    },
  };

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-butty-paper shadow-[0_0_40px_rgba(0,0,0,.15)] md:max-w-[800px] lg:max-w-[1080px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(localBusinessJsonLd(renovating)),
        }}
      />
      {view === "menu" && <CustomerMenu {...menuProps} />}
      {view === "account" && user && (
        <AccountScreen
          profile={loyalty}
          orders={myHistory}
          myOrderNo={myOrderNo}
          onBack={() => setView("menu")}
          onOptIn={async (optedIn, displayName) => {
            await setClubOptIn(optedIn, displayName);
          }}
          onSaveName={async (n) => {
            await saveName(n);
            setName(n.split(" ")[0] || n);
          }}
          reorder={reorder}
          lineUnavailable={lineUnavailable}
        />
      )}
      {view === "privacy" && (
        <Privacy
          onBack={() =>
            setView(privacyFrom === "privacy" ? "menu" : privacyFrom)
          }
        />
      )}
      {view === "customise" && editing && (
        <Customise
          item={editing}
          onAdd={addLine}
          onBack={() => setView("menu")}
        />
      )}
      {view === "checkout" && (
        <Checkout
          cart={cart}
          total={total}
          payable={payable}
          removeLine={removeLine}
          collectTime={collectTime}
          setCollectTime={setCollectTime}
          name={name}
          setName={setName}
          hour={hour}
          doPlace={doPlace}
          back={() => setView("menu")}
          signedIn={!!user}
          loyalty={loyalty}
          redeemReward={redeemReward}
          setRedeemReward={setRedeemReward}
          sandwichInCart={sandwichInCart}
          freeSandwich={freeSandwich}
          onSignIn={() => navigate({ to: "/login" })}
          payError={payError}
          openPrivacy={() => {
            setPrivacyFrom("checkout");
            setView("privacy");
          }}
        />
      )}
      {view === "paying" && (
        <TestPay
          total={payable}
          onPaid={finishPay}
          onBack={() => setView("checkout")}
        />
      )}
      {showTracking && myOrder && (
        <Tracking order={myOrder} reset={reset} backToMenu={backToMenu} />
      )}
      {view === "tracking" && !myOrder && <CustomerMenu {...menuProps} />}
    </div>
  );
}

function CustomerMenu({
  sections,
  sectionState,
  isOpenNow,
  shopOpen,
  renovating,
  cart,
  openCustomise,
  total,
  goCheckout,
  myOrder,
  viewMyOrder,
  accountLabel,
  clubStamps,
  openAccount,
  usual,
  reorder,
  reorderNote,
  clearReorderNote,
  openPrivacy,
}: {
  sections: { name: string; note: string; items: MenuItem[] }[];
  sectionState: (items: MenuItem[]) => {
    open: boolean;
    label: string | null;
  };
  isOpenNow: boolean;
  shopOpen: boolean;
  renovating: boolean;
  cart: OrderLine[];
  openCustomise: (item: MenuItem) => void;
  total: number;
  goCheckout: () => void;
  myOrder: Order | null | undefined;
  viewMyOrder: () => void;
  accountLabel: string | null;
  clubStamps: number | null;
  openAccount: () => void;
  usual: Order | null;
  reorder: (o: Order) => void;
  reorderNote: ReorderNote | null;
  clearReorderNote: () => void;
  openPrivacy: () => void;
}) {
  const qtyOf = (id: string) => cart.filter((l) => l.itemId === id).length;
  const count = cart.length;
  const liveStage = myOrder ? STAGES[myOrder.stage] : null;
  const LiveIcon = liveStage?.icon;
  const [activeSection, setActiveSection] = useState(sections[0]?.name ?? "");

  useEffect(() => {
    const nodes = sections
      .map((s) => document.getElementById(sectionAnchor(s.name)))
      .filter((el): el is HTMLElement => !!el);
    if (!nodes.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!hit) return;
        const name = sections.find(
          (s) => sectionAnchor(s.name) === hit.target.id,
        )?.name;
        if (name) setActiveSection(name);
      },
      { rootMargin: "-80px 0px -65% 0px", threshold: [0.1, 0.35, 0.6] },
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [sections]);

  const jumpTo = (name: string) => {
    setActiveSection(name);
    document
      .getElementById(sectionAnchor(name))
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className={cn("pb-6", (count > 0 || myOrder) && "pb-24")}>
      <div className="border-b-[3px] border-butty-ink bg-butty-yellow px-4 pb-4 pt-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Logo size={34} align="start" />
          </div>
          <button
            type="button"
            onClick={openAccount}
            className="mt-0.5 flex shrink-0 items-center gap-1.5 rounded-full border-2 border-butty-ink bg-butty-paper px-3 py-2 text-[12.5px] font-bold"
          >
            {accountLabel === null ? (
              <span className="inline-block h-4 w-16 animate-pulse rounded bg-butty-ink/15" />
            ) : (
              <>
                <User size={14} /> {accountLabel}
                {clubStamps != null && (
                  <span className="rounded-full bg-butty-red px-1.5 py-px text-[10px] font-bold text-butty-cream tabular-nums">
                    {clubStamps}/{STAMPS_FOR_REWARD}
                  </span>
                )}
              </>
            )}
          </button>
        </div>
        <div className="mt-3 text-center">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold text-white",
              isOpenNow ? "bg-butty-green" : "bg-butty-ink",
            )}
          >
            <span
              className={cn(
                "size-2 rounded-full bg-white",
                isOpenNow && "animate-pulse",
              )}
            />
            {!shopOpen
              ? renovating
                ? "Opening soon"
                : "Not taking online orders right now"
              : isOpenNow
                ? "Open · order for collection"
                : "Closed · opens 8am"}
          </span>
        </div>
      </div>

      <div className="sticky top-0 z-20 border-b-2 border-butty-ink bg-butty-yellow">
        <div className="flex gap-2 overflow-x-auto px-4 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {sections.map((s) => (
            <button
              key={s.name}
              type="button"
              onClick={() => jumpTo(s.name)}
              className={cn(
                "shrink-0 rounded-full border-2 border-butty-ink px-3.5 py-2 text-[13px] font-bold",
                activeSection === s.name
                  ? "bg-butty-ink text-butty-cream"
                  : "bg-butty-paper text-butty-ink",
              )}
            >
              {SECTION_SHORT[s.name] ?? s.name}
            </button>
          ))}
        </div>
      </div>

      {reorderNote && (
        <div
          className={cn(
            "m-4 rounded-xl border-2 p-3.5 text-[13px]",
            reorderNote.dropped.length
              ? "border-amber-500 bg-butty-warn-bg"
              : "border-butty-green bg-butty-ok-bg",
          )}
        >
          <div className="flex items-start justify-between gap-2.5">
            <div>
              {reorderNote.ok.length > 0 && (
                <div className="font-bold">
                  Added back to your order: {reorderNote.ok.join(", ")}.
                </div>
              )}
              {reorderNote.dropped.length > 0 && (
                <div
                  className={cn(
                    "text-butty-warn",
                    reorderNote.ok.length ? "mt-1.5" : "",
                  )}
                >
                  Couldn't add:{" "}
                  {reorderNote.dropped
                    .map((d) => `${d.name} (${d.reason})`)
                    .join(", ")}
                  .
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={clearReorderNote}
              className="border-none bg-transparent p-0.5"
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {usual && count === 0 && !renovating && (
        <div className="mx-4 mt-4 rounded-[14px] bg-butty-ink p-3.5 text-butty-cream">
          <div className="text-[11.5px] font-semibold tracking-widest uppercase opacity-60">
            Your usual
          </div>
          <div className="mt-0.5 text-[14.5px] font-bold">
            {usual.lines
              .map((l) => `${l.qty > 1 ? l.qty + "× " : ""}${l.name}`)
              .join(", ")}
          </div>
          <button
            type="button"
            onClick={() => reorder(usual)}
            className="mt-2.5 rounded-[10px] bg-butty-yellow px-4 py-2.5 text-sm font-bold text-butty-ink"
          >
            Reorder — £
            {usual.lines.reduce((s, l) => s + l.linePrice, 0).toFixed(2)}
          </button>
        </div>
      )}

      {renovating ? (
        <div className="m-4 rounded-xl border-2 border-butty-ink bg-butty-cream p-4 text-center">
          <div className="font-display text-base">Opening soon</div>
          <p className="mt-1.5 mb-0 text-[13.5px] leading-relaxed text-butty-ink">
            We're getting 19 Replingham Road ready. Have a look at the menu
            below — we'll take orders when the shutters go up.
          </p>
        </div>
      ) : (
        !shopOpen && (
        <div className="m-4 rounded-xl border-2 border-dashed border-butty-ink bg-butty-cream p-3.5 text-center text-[13.5px]">
          We've paused online orders for a bit — pop in and order at the
          counter, or check back shortly.
        </div>
        )
      )}

      {sections.map((s) => {
        const st = sectionState(s.items);
        return (
          <div
            key={s.name}
            id={sectionAnchor(s.name)}
            className="scroll-mt-[58px] px-[18px] pt-5 pb-1"
          >
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="m-0 font-display text-lg">{s.name}</h2>
              {!st.open && st.label && (
                <span className="inline-flex items-center gap-1 rounded-full bg-butty-cream px-2 py-0.5 text-xs font-semibold text-butty-red">
                  <Clock size={12} /> {st.label}
                </span>
              )}
            </div>
            <div className="mt-0.5 mb-3 text-[12.5px] text-butty-muted">
              {s.note}
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {s.items.map((it) => {
                const q = qtyOf(it.id);
                const buyable = st.open && shopOpen && !it.soldOut;
                return (
                  <article
                    key={it.id}
                    className={cn(
                      "flex flex-col overflow-hidden rounded-[18px] border-[3px] border-butty-ink bg-butty-paper",
                      q
                        ? "shadow-[3px_3px_0_var(--color-butty-red)]"
                        : "shadow-[3px_3px_0_var(--color-butty-shadow)]",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => openCustomise(it)}
                      className="w-full text-left"
                    >
                      <MenuPhoto item={it} soldOut={it.soldOut} size="card" />
                      <div className="px-3 pt-3">
                        <div className="flex items-start gap-1.5 text-[15px] font-bold leading-tight">
                          <span className="min-w-0 flex-1">{it.name}</span>
                          {it.veg && (
                            <Leaf
                              size={14}
                              className="mt-0.5 shrink-0 text-butty-green"
                              aria-label="Vegetarian"
                            />
                          )}
                        </div>
                        <p className="mt-1 mb-0 truncate text-[13px] leading-snug text-butty-muted">
                          {it.desc}
                        </p>
                      </div>
                    </button>
                    <div className="mt-auto flex items-center justify-between gap-2 px-3 pt-2 pb-3">
                      <div className="font-bold tabular-nums text-butty-red-deep">
                        £{it.price.toFixed(2)}
                      </div>
                      {it.soldOut ? (
                        <span className="rounded-full bg-butty-ink px-2.5 py-1 text-[11px] font-bold text-butty-cream">
                          Sold out
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={!buyable}
                          onClick={() => openCustomise(it)}
                          aria-label={`Add ${it.name}`}
                          className={cn(
                            "grid size-11 shrink-0 place-items-center rounded-[10px] border-2 border-butty-ink",
                            buyable ? "bg-butty-yellow" : "bg-butty-disabled",
                          )}
                        >
                          {q > 0 ? (
                            <span className="text-sm font-bold tabular-nums">
                              {q}
                            </span>
                          ) : (
                            <Plus size={20} />
                          )}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        );
      })}

      <FindUs />

      <div className="px-5 py-6 text-center text-xs text-butty-faint">
        <button
          type="button"
          onClick={openPrivacy}
          className="mt-1.5 block w-full border-none bg-transparent text-xs font-semibold text-butty-muted underline decoration-butty-line underline-offset-2"
        >
          Privacy, allergens & refunds
        </button>
      </div>

      {(count > 0 || myOrder) && (
        <div className="sticky bottom-0 grid gap-2.5 bg-gradient-to-t from-butty-paper from-30% to-transparent p-3.5">
          {myOrder && liveStage && LiveIcon && (
            <button
              type="button"
              onClick={viewMyOrder}
              className={cn(
                "flex w-full items-center justify-between rounded-2xl border-2 border-butty-ink px-[18px] py-3 text-[15px] font-bold text-white",
                STAGE_BG[liveStage.color],
              )}
            >
              <span className="flex items-center gap-2.5">
                <LiveIcon size={18} />
                Order #{myOrder.no} · {liveStage.cust}
              </span>
              <span className="text-[13px] opacity-90">View →</span>
            </button>
          )}
          {count > 0 && (
            <button
              type="button"
              onClick={goCheckout}
              className="flex w-full items-center justify-between rounded-2xl bg-butty-red px-5 py-4 text-base font-bold text-butty-cream shadow-[0_6px_0_var(--color-butty-red-deep)]"
            >
              <span className="flex items-center gap-2.5">
                <span className="grid h-[26px] min-w-[26px] place-items-center rounded-full bg-butty-cream text-sm text-butty-red">
                  {count}
                </span>
                View order
              </span>
              <span className="tabular-nums">£{total.toFixed(2)}</span>
            </button>
          )}
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
  const [qty, setQty] = useState(1);
  const extrasTotal = extras.reduce((s, e) => s + e.p, 0);
  const unit = item.price + extrasTotal;
  const linePrice = unit * qty;
  const toggleRemove = (r: string) =>
    setRemoved((x) => (x.includes(r) ? x.filter((i) => i !== r) : [...x, r]));
  const toggleExtra = (e: { n: string; p: number }) =>
    setExtras((x) =>
      x.find((i) => i.n === e.n) ? x.filter((i) => i.n !== e.n) : [...x, e],
    );
  const commit = () => {
    const mods: string[] = [];
    removed.forEach((r) => mods.push(`No ${r.toLowerCase()}`));
    extras.forEach((e) => mods.push(`+ ${e.n}`));
    onAdd({ itemId: item.id, name: item.name, mods, unit, linePrice, qty });
  };

  return (
    <div className="pb-6">
      <ScreenHead title={item.name} onBack={onBack} />
      <div className="mx-auto max-w-[520px] px-[18px] py-[18px]">
        <MenuPhoto item={item} soldOut={item.soldOut} size="hero" />
        <div className="mt-3 text-[13.5px] leading-snug text-butty-muted">
          {item.desc}
        </div>
        {item.remove.length > 0 && (
          <>
            <SubHead>Take something out?</SubHead>
            <div className="flex flex-wrap gap-2">
              {item.remove.map((r) => {
                const off = removed.includes(r);
                return (
                  <Chip key={r} on={off} onClick={() => toggleRemove(r)}>
                    {off ? `No ${r}` : r}
                  </Chip>
                );
              })}
            </div>
          </>
        )}
        {item.extras.length > 0 && (
          <>
            <SubHead>Add extras</SubHead>
            <div className="grid gap-2">
              {item.extras.map((e) => {
                const on = !!extras.find((i) => i.n === e.n);
                return (
                  <button
                    key={e.n}
                    type="button"
                    onClick={() => toggleExtra(e)}
                    className={cn(
                      "flex items-center justify-between rounded-xl border-2 border-butty-ink px-3.5 py-3 text-[14.5px] font-semibold",
                      on
                        ? "bg-butty-red text-butty-cream"
                        : "bg-butty-paper text-butty-ink",
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "grid size-[22px] place-items-center rounded-md border-2",
                          on ? "border-butty-cream" : "border-butty-ink",
                        )}
                      >
                        {on && <Check size={14} />}
                      </span>
                      {e.n}
                    </span>
                    <span className="tabular-nums">
                      {e.p > 0 ? `+£${e.p.toFixed(2)}` : "free"}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
        {item.allergens.length > 0 && (
          <div className="mt-5 flex items-start gap-2 text-xs text-butty-muted">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            Contains {item.allergens.join(", ")}.
          </div>
        )}
        <div className="mt-6 flex items-center justify-center gap-4">
          <QtyBtn large onClick={() => setQty((q) => Math.max(1, q - 1))}>
            <Minus size={18} />
          </QtyBtn>
          <span className="min-w-[30px] text-center font-display text-2xl tabular-nums">
            {qty}
          </span>
          <QtyBtn large onClick={() => setQty((q) => q + 1)}>
            <Plus size={18} />
          </QtyBtn>
        </div>
        <PrimaryButton className="mt-5" onClick={commit} disabled={item.soldOut}>
          {item.soldOut ? "Sold out" : `Add to order · £${linePrice.toFixed(2)}`}
        </PrimaryButton>
      </div>
    </div>
  );
}

function Checkout({
  cart,
  total,
  payable,
  removeLine,
  collectTime,
  setCollectTime,
  name,
  setName,
  hour,
  doPlace,
  back,
  signedIn,
  loyalty,
  redeemReward,
  setRedeemReward,
  sandwichInCart,
  freeSandwich,
  onSignIn,
  payError,
  openPrivacy,
}: {
  cart: OrderLine[];
  total: number;
  payable: number;
  removeLine: (i: number) => void;
  collectTime: string;
  setCollectTime: (v: string) => void;
  name: string;
  setName: (v: string) => void;
  hour: number;
  doPlace: () => void;
  back: () => void;
  signedIn: boolean;
  loyalty: import("@/lib/loyalty").LoyaltyProfile | null;
  redeemReward: boolean;
  setRedeemReward: (v: boolean) => void;
  sandwichInCart: boolean;
  freeSandwich: number;
  onSignIn: () => void;
  payError: string | null;
  openPrivacy: () => void;
}) {
  const slots = useMemo(() => buildSlots(hour), [hour]);
  const canPay = cart.length > 0 && name.trim().length > 1;
  const menu = useShop((s) => s.menu);
  return (
    <div className="pb-6">
      <ScreenHead title="Your order" onBack={back} />
      <div className="mx-auto max-w-[520px] px-[18px] py-[18px]">
        <div className="grid gap-2">
          {cart.map((l, i) => {
            const item = menu.find((m) => m.id === l.itemId);
            return (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border-2 border-butty-ink bg-butty-paper px-[13px] py-[11px]"
              >
                <MenuPhoto
                  item={item || { id: l.itemId, name: l.name }}
                  alt={l.name}
                  size="thumb"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[14.5px] font-bold">
                    {l.qty > 1 ? `${l.qty}× ` : ""}
                    {l.name}
                  </div>
                  {l.mods.length > 0 && (
                    <div className="mt-0.5 text-[12.5px] text-butty-muted">
                      {l.mods.join(" · ")}
                    </div>
                  )}
                  <div className="mt-0.5 text-[13px] font-semibold tabular-nums text-butty-red-deep">
                    £{l.linePrice.toFixed(2)}
                  </div>
                </div>
                <QtyBtn onClick={() => removeLine(i)}>
                  <Minus size={15} />
                </QtyBtn>
              </div>
            );
          })}
        </div>
        <SubHead>Collection time</SubHead>
        <div className="flex flex-wrap gap-2">
          {slots.map((s) => (
            <Chip
              key={s.value}
              on={collectTime === s.value}
              onClick={() => setCollectTime(s.value)}
            >
              {s.label}
            </Chip>
          ))}
        </div>
        <SubHead>Name for the order</SubHead>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sam"
          style={inpStyle}
        />

        {signedIn && loyalty?.optedIn ? (
          <div className="mt-5 rounded-xl border-2 border-butty-ink bg-butty-cream p-3.5">
            <div className="flex items-baseline justify-between">
              <div className="font-display text-sm">Butty Club</div>
              <div className="text-[13px] font-bold tabular-nums">
                {loyalty.card}/{STAMPS_FOR_REWARD}
              </div>
            </div>
            {loyalty.canRedeem && sandwichInCart ? (
              <label className="mt-2.5 flex items-start gap-2.5 text-[13.5px] font-semibold">
                <input
                  type="checkbox"
                  checked={redeemReward}
                  onChange={(e) => setRedeemReward(e.target.checked)}
                  className="mt-0.5 size-4 accent-butty-red"
                />
                <span>
                  Use my free sandwich — £{freeSandwich.toFixed(2)} off
                </span>
              </label>
            ) : loyalty.canRedeem ? (
              <p className="mt-1.5 mb-0 text-[12.5px] text-butty-muted">
                Add a sandwich to redeem your free one.
              </p>
            ) : (
              <p className="mt-1.5 mb-0 text-[12.5px] text-butty-muted">
                {loyalty.remainingToReward} sandwich
                {loyalty.remainingToReward === 1 ? "" : "es"} to a free one.
                Paid sandwiches on this order add stamps.
              </p>
            )}
          </div>
        ) : signedIn ? (
          <p className="mt-4 mb-0 text-[12.5px] text-butty-muted">
            Join the Butty Club from your account to collect stamps on this
            order.
          </p>
        ) : (
          <button
            type="button"
            onClick={onSignIn}
            className="mt-4 w-full rounded-xl border-2 border-dashed border-butty-ink bg-butty-cream px-3 py-3 text-[13.5px] font-semibold"
          >
            Sign in to collect Butty Club stamps
          </button>
        )}

        <div className="mt-[18px] flex justify-between rounded-xl border-2 border-dashed border-butty-ink bg-butty-cream p-3.5 text-[17px] font-bold">
          <span>Total</span>
          <span className="tabular-nums">
            {redeemReward && payable !== total ? (
              <>
                <span className="mr-2 text-sm font-semibold text-butty-muted line-through">
                  £{total.toFixed(2)}
                </span>
                £{payable.toFixed(2)}
              </>
            ) : (
              <>£{total.toFixed(2)}</>
            )}
          </span>
        </div>
        {payError && (
          <div className="mt-3 rounded-xl border-2 border-butty-red bg-butty-warn-bg px-3 py-2.5 text-[13px] font-semibold text-butty-red-deep">
            {payError}
          </div>
        )}
        <PrimaryButton
          className="mt-4 text-[17px]"
          disabled={!canPay}
          onClick={doPlace}
        >
          Pay £{payable.toFixed(2)} & collect
        </PrimaryButton>
        <p className="mt-3 text-center text-[12px] leading-snug text-butty-faint">
          Collection only from 19 Replingham Road. Allergens are listed on each
          item — tell us about allergies when you collect. If we pack the wrong
          thing, we'll remake or refund at the counter.
        </p>
        <button
          type="button"
          onClick={openPrivacy}
          className="mt-1.5 w-full border-none bg-transparent text-[12px] font-semibold text-butty-muted underline decoration-butty-line underline-offset-2"
        >
          Privacy notice
        </button>
        <div className="mt-2 text-center text-xs text-butty-faint">
          Next: test card 4242… · no real charge
        </div>
      </div>
    </div>
  );
}

function Tracking({
  order,
  reset,
  backToMenu,
}: {
  order: Order;
  reset: () => void;
  backToMenu: () => void;
}) {
  const menu = useShop((s) => s.menu);
  const pct = (order.stage / (STAGES.length - 1)) * 100;
  const st = STAGES[order.stage];
  const ready = order.stage === STAGES.length - 1;
  const Icon = st.icon;
  const barColor =
    order.stage === STAGES.length - 1 ? "bg-butty-green" : "bg-butty-red";
  const paid = order.lines.reduce((s, l) => s + l.linePrice, 0);
  const net = Math.max(0, paid - (order.discountGbp || 0));

  return (
    <div className="pb-6">
      <ScreenHead title="Your order" onBack={backToMenu} />
      <div className="mx-auto max-w-[520px] px-6 py-6">
        <div className="mb-5 text-center">
          <div className="text-xs font-semibold tracking-[2px] text-butty-muted uppercase">
            Collection no.
          </div>
          <div className="font-display text-[44px] leading-none text-butty-red">
            #{order.no}
          </div>
        </div>
        <div className="h-3 overflow-hidden rounded-full border-2 border-butty-ink bg-butty-track">
          <div
            className={cn("h-full transition-[width] duration-500", barColor)}
            style={{
              width: `${pct}%`,
              transitionTimingFunction: "cubic-bezier(.4,0,.2,1)",
            }}
          />
        </div>
        <div className="mt-2 flex justify-between">
          {STAGES.map((s, i) => (
            <div key={s.key} className="flex-1 text-center">
              <div
                className={cn(
                  "mx-auto size-3.5 rounded-full border-2 border-butty-ink",
                  i <= order.stage
                    ? order.stage === STAGES.length - 1
                      ? "bg-butty-green"
                      : "bg-butty-red"
                    : "bg-butty-track",
                )}
              />
              <div
                className={cn(
                  "mt-1 text-[9.5px] leading-tight font-semibold",
                  i <= order.stage ? "text-butty-ink" : "text-butty-faint",
                )}
              >
                {s.label.replace("Order ", "")}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-7 text-center">
          {order.collected ? (
            <>
              <div className="mx-auto mb-2.5 grid size-16 place-items-center rounded-full bg-butty-green">
                <Check size={34} color="#fff" strokeWidth={3} />
              </div>
              <div className="font-display text-[19px] text-butty-green">
                Enjoy, {order.name}
              </div>
              <div className="mt-1 text-[13.5px] text-butty-muted">
                Order collected — thanks for coming in.
              </div>
            </>
          ) : (
            <>
              <Icon
                size={36}
                className={cn("mx-auto", STAGE_TEXT[st.color])}
                strokeWidth={2.2}
              />
              <div
                className={cn(
                  "mt-2 font-display text-[19px]",
                  STAGE_TEXT[st.color],
                )}
              >
                {st.cust}
              </div>
              {ready && (
                <div className="mt-1.5 text-sm font-semibold text-butty-green">
                  {order.name}, your order's on the counter
                </div>
              )}
            </>
          )}
        </div>
        <div className="mt-6 border-t-2 border-dashed border-butty-line pt-4">
          {order.lines.map((l, i) => {
            const item = menu.find((m) => m.id === l.itemId);
            return (
              <div key={i} className="mb-2 flex items-center gap-3">
                <MenuPhoto
                  item={item || { id: l.itemId, name: l.name }}
                  alt={l.name}
                  size="thumb"
                />
                <div className="min-w-0 flex-1 text-[13.5px]">
                  <div className="font-bold">
                    {l.qty > 1 ? `${l.qty}× ` : ""}
                    {l.name}
                  </div>
                  {l.mods.length > 0 && (
                    <div className="text-butty-muted">{l.mods.join(", ")}</div>
                  )}
                </div>
              </div>
            );
          })}
          <div className="mt-2 flex justify-between text-sm font-bold">
            <span>Paid</span>
            <span className="tabular-nums">£{net.toFixed(2)}</span>
          </div>
          {!!order.discountGbp && (
            <div className="text-[12.5px] font-semibold text-butty-green">
              Butty Club −£{order.discountGbp.toFixed(2)}
            </div>
          )}
          {!!order.pointsEarned && (
            <div className="mt-1 rounded-xl bg-butty-ok-bg px-3 py-2 text-[13px] font-semibold text-butty-green-deep">
              +{order.pointsEarned} Butty Club points on this order
            </div>
          )}
        </div>
        {!order.collected && (
          <div className="mt-3 text-center text-[12.5px] text-butty-faint">
            We’ll ping this screen as the kitchen gets your order ready.
          </div>
        )}
        <PrimaryButton className="mt-5" onClick={reset}>
          {order.collected ? "Order again" : "Start a new order"}
        </PrimaryButton>
      </div>
    </div>
  );
}
