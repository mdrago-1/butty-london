import { Bell, ChefHat, Store } from "lucide-react";
import { STAGES } from "@/lib/stages";
import { useShop } from "@/lib/store";
import type { Order } from "@/lib/types";

export function Kitchen() {
  const orders = useShop((s) => s.orders);
  const setStage = useShop((s) => s.setStage);
  const markCollected = useShop((s) => s.markCollected);

  const READY = STAGES.length - 1;
  const live = orders.filter((o) => !o.collected && !o.voided);
  const inProgress = live.filter((o) => o.stage < READY);
  const readyWaiting = live.filter((o) => o.stage === READY);
  const collected = orders.filter((o) => o.collected && !o.voided);

  return (
    <div className="mx-auto min-h-full max-w-[900px] px-4 py-5 pb-10">
      <div className="mb-1 flex items-center gap-2.5">
        <ChefHat size={22} />
        <h1 className="m-0 font-display text-[22px]">Kitchen</h1>
        <a
          href="/counter"
          className="flex h-9 items-center gap-1.5 rounded-full border-2 border-butty-ink bg-butty-paper px-3 text-xs font-bold text-butty-ink no-underline"
        >
          <Store size={13} /> Till
        </a>
        <span className="ml-auto flex gap-1.5">
          <span className="rounded-full bg-butty-ink px-3 py-1 text-[13px] font-bold text-butty-cream">
            {inProgress.length} making
          </span>
          <span className="rounded-full bg-butty-green px-3 py-1 text-[13px] font-bold text-white">
            {readyWaiting.length} to collect
          </span>
        </span>
      </div>
      <p className="mb-[18px] text-[12.5px] text-butty-ink/60">
        New orders appear here. Advance them as you cook; when the customer
        picks up, hit <b>Collected</b>.
      </p>

      {inProgress.length === 0 && readyWaiting.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-butty-ink bg-butty-paper px-10 py-10 text-center text-butty-muted">
          No live orders yet. New tickets land here as soon as a customer
          pays.
        </div>
      )}

      {readyWaiting.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-2.5 flex items-center gap-1.5 font-display text-[15px] text-butty-green">
            <Bell size={16} /> Ready — waiting for pickup
          </h3>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
            {readyWaiting.map((o) => (
              <ReadyCard
                key={o.no}
                order={o}
                onBack={() => setStage(o.no, o.stage - 1)}
                onCollected={() => markCollected(o.no)}
              />
            ))}
          </div>
        </div>
      )}

      {inProgress.length > 0 && (
        <h3 className="mb-2.5 flex items-center gap-1.5 font-display text-[15px]">
          <ChefHat size={16} /> Making now
        </h3>
      )}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
        {inProgress.map((o) => (
          <MakingCard
            key={o.no}
            order={o}
            onBack={() => setStage(o.no, o.stage - 1)}
            onNext={() => setStage(o.no, o.stage + 1)}
          />
        ))}
      </div>

      {collected.length > 0 && (
        <div className="mt-7">
          <h3 className="font-display text-[15px] text-butty-ink/70">
            Collected today
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {collected.map((o) => (
              <div
                key={o.no}
                className="rounded-xl border-2 border-butty-line bg-butty-cream px-[13px] py-[7px] text-[13.5px] font-semibold text-butty-muted"
              >
                #{o.no} · {o.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ReadyCard({
  order: o,
  onBack,
  onCollected,
}: {
  order: Order;
  onBack: () => void;
  onCollected: () => void;
}) {
  return (
    <div className="rounded-[18px] bg-butty-green p-4 shadow-[4px_4px_0_var(--color-butty-green-deep)]">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="font-display text-2xl text-white">#{o.no}</div>
          <div className="text-[13px] font-semibold text-white/90">
            {o.name} ·{" "}
            {o.source === "counter"
              ? o.takenByName
                ? `Till · ${o.takenByName}`
                : "Till"
              : o.collectTime === "asap"
                ? "ASAP"
                : o.collectTime}
          </div>
        </div>
        <div className="rounded-full bg-white px-[11px] py-[5px] text-xs font-bold text-butty-green">
          Ready
        </div>
      </div>
      <div className="mb-3 rounded-xl bg-black/18 p-3">
        {o.lines.map((l, i) => (
          <div key={i} className="mb-1.5 text-sm text-white">
            <span className="font-bold">
              {l.qty > 1 ? `${l.qty}× ` : ""}
              {l.name}
            </span>
            {l.mods.length > 0 && (
              <span className="text-[12.5px] opacity-85">
                {" "}
                — {l.mods.join(", ")}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBack}
          title="Sent to ready too early?"
          className="rounded-[10px] border-2 border-white/50 bg-transparent px-[13px] py-3 font-semibold text-white"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onCollected}
          className="flex-1 rounded-[10px] bg-white py-3 text-[15px] font-bold text-butty-green"
        >
          Collected
        </button>
      </div>
    </div>
  );
}

function MakingCard({
  order: o,
  onBack,
  onNext,
}: {
  order: Order;
  onBack: () => void;
  onNext: () => void;
}) {
  const st = STAGES[o.stage];
  const stageBg =
    st.color === "green"
      ? "bg-butty-green"
      : st.color === "red"
        ? "bg-butty-red"
        : "bg-butty-ink";
  return (
    <div className="rounded-[18px] bg-butty-ink p-4 shadow-[4px_4px_0_var(--color-butty-red-deep)]">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="font-display text-[22px] text-butty-yellow">
            #{o.no}
          </div>
          <div className="text-[12.5px] text-butty-cream/80">
            {o.name} ·{" "}
            {o.source === "counter"
              ? o.takenByName
                ? `Till · ${o.takenByName}`
                : "Till"
              : o.collectTime === "asap"
                ? "ASAP"
                : o.collectTime}
          </div>
        </div>
        <div
          className={`rounded-full px-[11px] py-[5px] text-xs font-bold text-white ${stageBg}`}
        >
          {st.label}
        </div>
      </div>
      <div className="mb-3 rounded-xl bg-butty-kitchen p-3">
        {o.lines.map((l, i) => (
          <div
            key={i}
            className={`mb-[7px] pb-[7px] text-sm text-butty-cream ${
              i < o.lines.length - 1
                ? "border-b border-butty-kitchen-line"
                : "mb-0 pb-0"
            }`}
          >
            <div className="font-bold">
              {l.qty > 1 ? `${l.qty}× ` : ""}
              {l.name}
            </div>
            {l.mods.length > 0 && (
              <div className="mt-0.5 text-[12.5px] text-butty-yellow">
                ▸ {l.mods.join(" · ")}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        {o.stage > 0 && (
          <button
            type="button"
            onClick={onBack}
            className="rounded-[10px] border-2 border-butty-kitchen-border bg-transparent px-[13px] py-[11px] font-semibold text-butty-cream"
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={onNext}
          className="flex-1 rounded-[10px] bg-butty-yellow px-[13px] py-[11px] text-sm font-bold text-butty-ink"
        >
          {o.stage === STAGES.length - 2
            ? "Mark ready"
            : `→ ${STAGES[o.stage + 1].label}`}
        </button>
      </div>
    </div>
  );
}
