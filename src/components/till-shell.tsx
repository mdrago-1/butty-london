import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeftRight,
  ChefHat,
  Delete,
  Lock,
  LogOut,
  Users,
  X,
} from "lucide-react";
import { Logo, Splash } from "@/components/logo";
import { ShopLive } from "@/components/staff-gate";
import { inpStyle } from "@/components/bits";
import { cn } from "@/lib/cn";
import {
  addStaffEmployee,
  clockOutTill,
  forceClockOutTill,
  getStaffSession,
  listTillRoster,
  setStaffEmployeeActive,
  setStaffEmployeePin,
  setStaffEmployeeRole,
  tillIdentify,
} from "@/lib/staff-api";
import {
  canForceClockOut,
  canManageTeam,
  canVoidTickets,
  fmtLondonTime,
  normalizePin,
  pinOk,
  tillRoleLabel,
  type ShiftTotals,
  type StaffSession,
  type TillPerson,
  type TillRole,
} from "@/lib/staff";
import { useShop } from "@/lib/store";
import type { Order } from "@/lib/types";

const IDLE_MS = 90_000;

export function TillShell({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<StaffSession | null>(null);
  const [roster, setRoster] = useState<TillPerson[]>([]);
  const [locked, setLocked] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [picked, setPicked] = useState<TillPerson | null>(null);
  const [totals, setTotals] = useState<ShiftTotals | null>(null);
  const [teamOpen, setTeamOpen] = useState(false);
  const [voiding, setVoiding] = useState<Order | null>(null);
  const [clockErr, setClockErr] = useState<string | null>(null);
  const lastActive = useRef(Date.now());

  const operator = session?.employeeId
    ? {
        id: session.employeeId,
        name: session.employeeName || "Staff",
        tillRole: session.tillRole || ("cashier" as TillRole),
        clockInAt: session.clockInAt ?? null,
      }
    : null;

  const load = async () => {
    const [s, people] = await Promise.all([
      getStaffSession(),
      listTillRoster(),
    ]);
    setSession(s);
    setRoster(people);
    return s;
  };

  useEffect(() => {
    let live = true;
    void load().then(() => {
      if (live) setReady(true);
    });
    const t = window.setInterval(() => {
      void load();
    }, 5000);
    return () => {
      live = false;
      window.clearInterval(t);
    };
  }, []);

  const padOpen = !!operator && !locked && !switching && !totals;

  useEffect(() => {
    if (!padOpen) return;
    const bump = () => {
      lastActive.current = Date.now();
    };
    lastActive.current = Date.now();
    window.addEventListener("pointerdown", bump);
    window.addEventListener("keydown", bump);
    const t = window.setInterval(() => {
      if (Date.now() - lastActive.current >= IDLE_MS) {
        setLocked(true);
        setTeamOpen(false);
        setVoiding(null);
      }
    }, 1000);
    return () => {
      window.removeEventListener("pointerdown", bump);
      window.removeEventListener("keydown", bump);
      window.clearInterval(t);
    };
  }, [padOpen]);

  const onShift = roster.filter((p) => p.onShift);
  const canTeam =
    !!operator &&
    (canManageTeam(operator.tillRole) || operator.tillRole === "shift_lead");

  const identified = async (s: StaffSession) => {
    setSession(s);
    setLocked(false);
    setSwitching(false);
    setPicked(null);
    setTotals(null);
    setTeamOpen(false);
    setRoster(await listTillRoster());
  };

  const clockOut = async () => {
    setClockErr(null);
    try {
      const sheet = await clockOutTill();
      setTotals(sheet);
      setSession({ role: "kitchen", till: true });
      setLocked(false);
      setSwitching(false);
      setPicked(null);
      setTeamOpen(false);
      setRoster(await listTillRoster());
    } catch (e) {
      setClockErr(e instanceof Error ? e.message : "Couldn't clock out.");
    }
  };

  if (!ready) return <Splash />;

  const showNames = !operator || switching;
  const showLock = !!operator && locked && !switching && !picked && !totals;
  const showPin = !!picked && !totals;
  const blockPad = !padOpen || !!totals || showNames || showLock || showPin;

  return (
    <ShopLive>
    <div className="flex min-h-dvh flex-col bg-butty-yellow font-sans text-butty-ink">
      <TillHeader
        operator={operator}
        onShift={onShift}
        canTeam={canTeam}
        onSwitch={() => {
          setSwitching(true);
          setPicked(null);
          setLocked(false);
        }}
        onLock={() => {
          setLocked(true);
          setTeamOpen(false);
          setSwitching(false);
          setPicked(null);
        }}
        onClockOut={() => void clockOut()}
        onTeam={() => setTeamOpen(true)}
        onPickOnShift={(p) => {
          if (operator && p.id === operator.id) return;
          setSwitching(true);
          setPicked(p);
        }}
      />
      <LiveQueue
        canVoid={canVoidTickets(operator?.tillRole) && padOpen}
        onVoid={setVoiding}
      />
      {clockErr && (
        <div className="border-b-2 border-butty-ink bg-butty-paper px-3 py-2 text-sm font-semibold text-butty-red">
          {clockErr}
        </div>
      )}
      <div className="relative min-h-0 flex-1">
        <div
          className={cn("h-full min-h-0", blockPad && "pointer-events-none")}
          aria-hidden={blockPad}
        >
          {children}
        </div>

        {blockPad && (
          <div className="absolute inset-0 z-40 overflow-y-auto bg-butty-yellow/97 px-4 py-6">
          {totals ? (
            <TotalsSheet
              totals={totals}
              onDone={() => setTotals(null)}
            />
          ) : showPin && picked ? (
            <PinStep
              person={picked}
              hint={
                picked.onShift
                  ? "Enter your code to take the till."
                  : "Enter your 4-digit code to clock in."
              }
              onBack={() => setPicked(null)}
              onOk={(s) => void identified(s)}
            />
          ) : showLock && operator ? (
            <LockStep
              name={operator.name}
              person={
                roster.find((p) => p.id === operator.id) ?? {
                  id: operator.id,
                  name: operator.name,
                  tillRole: operator.tillRole,
                  onShift: true,
                  clockInAt: operator.clockInAt,
                }
              }
              onUnlock={(s) => void identified(s)}
              onSwitch={() => {
                setSwitching(true);
                setPicked(null);
              }}
            />
          ) : (
            <ClockInStep
              people={roster}
              onShift={onShift}
              switching={switching}
              currentId={operator?.id}
              onPick={setPicked}
              onCancel={
                switching
                  ? () => {
                      setSwitching(false);
                      setPicked(null);
                    }
                  : undefined
              }
            />
          )}
        </div>
        )}
      </div>

      {teamOpen && operator && (
        <TeamSheet
          actor={operator}
          roster={roster}
          onClose={() => {
            setTeamOpen(false);
            void load();
          }}
          onRoster={setRoster}
        />
      )}

      {voiding && (
        <VoidConfirm
          order={voiding}
          onClose={() => setVoiding(null)}
        />
      )}
    </div>
    </ShopLive>
  );
}

function TillHeader({
  operator,
  onShift,
  canTeam,
  onSwitch,
  onLock,
  onClockOut,
  onTeam,
  onPickOnShift,
}: {
  operator: {
    id: string;
    name: string;
    tillRole: TillRole;
    clockInAt: string | null;
  } | null;
  onShift: TillPerson[];
  canTeam: boolean;
  onSwitch: () => void;
  onLock: () => void;
  onClockOut: () => void;
  onTeam: () => void;
  onPickOnShift: (p: TillPerson) => void;
}) {
  return (
    <header className="shrink-0 border-b-[3px] border-butty-ink bg-butty-yellow px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          {operator ? (
            <>
              <div className="truncate text-base font-bold leading-tight">
                {operator.name}
              </div>
              <div className="text-xs font-semibold text-butty-muted">
                {tillRoleLabel(operator.tillRole)}
                {operator.clockInAt
                  ? ` · in since ${fmtLondonTime(operator.clockInAt)}`
                  : ""}
              </div>
            </>
          ) : (
            <>
              <div className="font-display text-lg leading-none">Counter</div>
              <div className="text-xs font-semibold text-butty-muted">
                Clock in to take the till
              </div>
            </>
          )}
        </div>
        {operator && (
          <>
            <HeaderBtn onClick={onSwitch} label="Switch">
              <ArrowLeftRight size={14} /> Switch
            </HeaderBtn>
            <HeaderBtn onClick={onLock} label="Lock">
              <Lock size={14} /> Lock
            </HeaderBtn>
            <HeaderBtn onClick={onClockOut} label="Clock out">
              <LogOut size={14} /> Clock out
            </HeaderBtn>
          </>
        )}
        {canTeam && (
          <HeaderBtn onClick={onTeam} label="Team">
            <Users size={14} /> Team
          </HeaderBtn>
        )}
        <a
          href="/kitchen"
          className="flex h-10 items-center gap-1.5 rounded-full border-2 border-butty-ink bg-butty-paper px-3 text-xs font-bold text-butty-ink no-underline"
        >
          <ChefHat size={14} /> Kitchen
        </a>
      </div>
      {onShift.length > 0 && (
        <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="shrink-0 text-[10px] font-bold tracking-widest text-butty-muted uppercase">
            Today
          </span>
          {onShift.map((p) => {
            const active = operator?.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onPickOnShift(p)}
                className={cn(
                  "h-8 shrink-0 rounded-full border-2 border-butty-ink px-3 text-xs font-bold",
                  active
                    ? "bg-butty-ink text-butty-cream"
                    : "bg-butty-paper text-butty-ink",
                )}
              >
                {p.name}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}

function HeaderBtn({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-10 items-center gap-1.5 rounded-full border-2 border-butty-ink bg-butty-paper px-3 text-xs font-bold"
    >
      {children}
    </button>
  );
}

function LiveQueue({
  canVoid,
  onVoid,
}: {
  canVoid: boolean;
  onVoid: (o: Order) => void;
}) {
  const orders = useShop((s) => s.orders).filter(
    (o) => !o.collected && !o.voided,
  );
  if (orders.length === 0) {
    return (
      <div className="shrink-0 border-b-[3px] border-butty-ink bg-butty-paper px-3 py-2 text-xs font-semibold text-butty-muted">
        Live queue is clear
      </div>
    );
  }
  return (
    <div className="flex shrink-0 gap-2 overflow-x-auto border-b-[3px] border-butty-ink bg-butty-paper px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <span className="shrink-0 self-center text-[10px] font-bold tracking-widest text-butty-muted uppercase">
        Live
      </span>
      {orders.map((o) => (
        <div
          key={o.id || o.no}
          className="flex shrink-0 items-center gap-2 rounded-[12px] border-2 border-butty-ink bg-butty-cream px-3 py-1.5"
        >
          <div>
            <div className="text-sm font-bold leading-tight">
              #{o.no} · {o.name}
            </div>
            <div className="text-[11px] font-semibold text-butty-muted">
              {o.source === "counter" ? "Till" : "App"}
              {o.takenByName ? ` · ${o.takenByName}` : ""}
              {` · ${o.lines.reduce((n, l) => n + l.qty, 0)}`}
            </div>
          </div>
          {canVoid && o.id && (
            <button
              type="button"
              onClick={() => onVoid(o)}
              className="h-8 rounded-[8px] border-2 border-butty-ink bg-butty-paper px-2 text-[10px] font-bold tracking-wide uppercase"
            >
              Void
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function ClockInStep({
  people,
  onShift,
  switching,
  currentId,
  onPick,
  onCancel,
}: {
  people: TillPerson[];
  onShift: TillPerson[];
  switching: boolean;
  currentId?: string;
  onPick: (p: TillPerson) => void;
  onCancel?: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-[420px]">
      <Logo size={36} />
      <div className="mt-5 rounded-[22px] border-[3px] border-butty-ink bg-butty-paper p-5 shadow-[4px_4px_0_var(--color-butty-ink)]">
        <h1 className="m-0 font-display text-2xl leading-none">
          {switching ? "Switch user" : "Clock in"}
        </h1>
        <p className="mt-2 mb-0 text-sm leading-snug text-butty-muted">
          {switching
            ? "Pick who is taking the till. The live queue stays put."
            : "Pick your name, then your 4-digit code. No email on the till."}
        </p>
        {onShift.length > 0 && (
          <div className="mt-4">
            <div className="text-[10px] font-bold tracking-widest text-butty-muted uppercase">
              Today's roster
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {onShift.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onPick(p)}
                  className={cn(
                    "h-10 rounded-full border-2 border-butty-ink px-3 text-sm font-bold",
                    p.id === currentId
                      ? "bg-butty-ink text-butty-cream"
                      : "bg-butty-yellow text-butty-ink",
                  )}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}
        {people.length === 0 ? (
          <p className="mt-4 mb-0 text-sm font-semibold">
            No one is on the till yet. Add people in the office, under Staff.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {people.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onPick(p)}
                className="min-h-16 rounded-[16px] border-[3px] border-butty-ink bg-butty-yellow px-3 py-3 text-left"
              >
                <div className="text-base font-bold leading-tight">{p.name}</div>
                <div className="mt-0.5 text-xs font-semibold text-butty-muted">
                  {tillRoleLabel(p.tillRole)}
                  {p.onShift ? " · on shift" : ""}
                </div>
              </button>
            ))}
          </div>
        )}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="mt-4 h-11 w-full rounded-[12px] border-2 border-butty-ink bg-butty-cream text-sm font-bold"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

function LockStep({
  name,
  person,
  onUnlock,
  onSwitch,
}: {
  name: string;
  person: TillPerson;
  onUnlock: (s: StaffSession) => void;
  onSwitch: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-[380px]">
      <Logo size={36} />
      <div className="mt-5 rounded-[22px] border-[3px] border-butty-ink bg-butty-paper p-5 shadow-[4px_4px_0_var(--color-butty-ink)]">
        <div className="flex items-center gap-2">
          <Lock size={18} />
          <h1 className="m-0 font-display text-2xl leading-none">Till locked</h1>
        </div>
        <p className="mt-2 mb-0 text-sm text-butty-muted">
          Unlock as {name}, or switch user.
        </p>
        <PinPad
          onSubmit={async (pin) => {
            const s = await tillIdentify({
              data: { employeeId: person.id, pin },
            });
            onUnlock(s);
          }}
        />
        <button
          type="button"
          onClick={onSwitch}
          className="mt-3 flex h-12 w-full items-center justify-center gap-1.5 rounded-[12px] border-2 border-butty-ink bg-butty-cream text-sm font-bold"
        >
          <ArrowLeftRight size={14} /> Switch user
        </button>
      </div>
    </div>
  );
}

function PinStep({
  person,
  hint,
  onBack,
  onOk,
}: {
  person: TillPerson;
  hint: string;
  onBack: () => void;
  onOk: (s: StaffSession) => void;
}) {
  return (
    <div className="mx-auto w-full max-w-[380px]">
      <Logo size={36} />
      <div className="mt-5 rounded-[22px] border-[3px] border-butty-ink bg-butty-paper p-5 shadow-[4px_4px_0_var(--color-butty-ink)]">
        <h1 className="m-0 font-display text-2xl leading-none">{person.name}</h1>
        <p className="mt-2 mb-0 text-sm text-butty-muted">{hint}</p>
        <PinPad
          onSubmit={async (pin) => {
            const s = await tillIdentify({
              data: { employeeId: person.id, pin },
            });
            onOk(s);
          }}
        />
        <button
          type="button"
          onClick={onBack}
          className="mt-3 h-11 w-full text-sm font-bold underline"
        >
          Not you?
        </button>
      </div>
    </div>
  );
}

function PinPad({ onSubmit }: { onSubmit: (pin: string) => Promise<void> }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "del", "0", "go"];

  const go = async (raw: string) => {
    const pin = normalizePin(raw);
    if (!pinOk(pin) || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(pin);
      setCode("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "That code didn't match.");
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  const tap = (k: string) => {
    if (busy) return;
    if (k === "del") {
      setCode((c) => c.slice(0, -1));
      return;
    }
    if (k === "go") {
      void go(code);
      return;
    }
    const next = normalizePin(code + k);
    setCode(next);
    if (next.length === 4) void go(next);
  };

  return (
    <>
      <div
        className="mt-5 flex min-h-14 items-center justify-center gap-3 rounded-[14px] border-2 border-butty-ink bg-butty-cream"
        aria-label="Code"
      >
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "size-3.5 rounded-full border-2 border-butty-ink",
              i < code.length ? "bg-butty-ink" : "bg-transparent",
            )}
          />
        ))}
      </div>
      {error && (
        <p className="mt-3 mb-0 text-center text-sm font-semibold text-butty-red">
          {error}
        </p>
      )}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            disabled={busy || (k === "go" && code.length < 4)}
            onClick={() => tap(k)}
            className={cn(
              "flex min-h-16 items-center justify-center rounded-[14px] border-2 border-butty-ink text-2xl font-bold",
              k === "go"
                ? "bg-butty-red text-butty-cream disabled:opacity-40"
                : k === "del"
                  ? "bg-butty-cream text-butty-ink"
                  : "bg-butty-yellow text-butty-ink",
            )}
            aria-label={k === "del" ? "Delete" : k === "go" ? "Unlock" : k}
          >
            {k === "del" ? (
              <Delete size={22} />
            ) : k === "go" ? (
              <span className="text-base">Go</span>
            ) : (
              k
            )}
          </button>
        ))}
      </div>
    </>
  );
}

function TotalsSheet({
  totals,
  onDone,
}: {
  totals: ShiftTotals;
  onDone: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-[380px]">
      <div className="rounded-[22px] border-[3px] border-butty-ink bg-butty-paper p-5 shadow-[4px_4px_0_var(--color-butty-ink)]">
        <div className="text-xs font-bold tracking-widest text-butty-muted uppercase">
          Shift over
        </div>
        <h1 className="mt-1 mb-0 font-display text-3xl leading-none">
          {totals.employeeName}
        </h1>
        <p className="mt-3 mb-0 text-sm font-semibold text-butty-muted">
          {fmtLondonTime(totals.clockIn)} – {fmtLondonTime(totals.clockOut)}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat label="Hours" value={totals.hours.toFixed(2)} />
          <Stat label="Tickets" value={String(totals.tickets)} />
          <Stat label="Taken" value={`£${totals.takings.toFixed(2)}`} />
        </div>
        <button
          type="button"
          onClick={onDone}
          className="mt-5 h-14 w-full rounded-2xl bg-butty-red text-base font-bold text-butty-cream shadow-[0_5px_0_var(--color-butty-red-deep)]"
        >
          Done
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] border-2 border-butty-ink bg-butty-yellow px-2 py-3 text-center">
      <div className="text-[10px] font-bold tracking-widest text-butty-muted uppercase">
        {label}
      </div>
      <div className="mt-1 text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}

function VoidConfirm({
  order,
  onClose,
}: {
  order: Order;
  onClose: () => void;
}) {
  const voidOrder = useShop((s) => s.voidOrder);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = async () => {
    if (!order.id) return;
    setBusy(true);
    setError(null);
    try {
      await voidOrder(order.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't void that ticket.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-butty-ink/55 p-4">
      <div className="w-full max-w-sm rounded-[22px] border-[3px] border-butty-ink bg-butty-paper p-5 shadow-[6px_6px_0_var(--color-butty-ink)]">
        <div className="text-xs font-bold tracking-widest text-butty-muted uppercase">
          Void ticket
        </div>
        <h2 className="mt-1 mb-0 font-display text-2xl">#{order.no}</h2>
        <p className="mt-2 mb-0 text-sm font-semibold">{order.name}</p>
        {error && (
          <p className="mt-2 mb-0 text-sm font-semibold text-butty-red">
            {error}
          </p>
        )}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-12 flex-1 rounded-[12px] border-2 border-butty-ink bg-butty-cream text-sm font-bold"
          >
            Keep
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void go()}
            className="h-12 flex-1 rounded-[12px] bg-butty-red text-sm font-bold text-butty-cream"
          >
            {busy ? "Voiding…" : "Void"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TeamSheet({
  actor,
  roster,
  onClose,
  onRoster,
}: {
  actor: { id: string; name: string; tillRole: TillRole };
  roster: TillPerson[];
  onClose: () => void;
  onRoster: (people: TillPerson[]) => void;
}) {
  const manager = canManageTeam(actor.tillRole);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [people, setPeople] = useState(roster);

  const refresh = async () => {
    const next = await listTillRoster();
    setPeople(next);
    onRoster(next);
  };

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-butty-ink/55 p-4">
      <div className="mx-auto w-full max-w-[440px] rounded-[22px] border-[3px] border-butty-ink bg-butty-paper p-4 shadow-[6px_6px_0_var(--color-butty-ink)]">
        <div className="mb-3 flex items-center gap-2">
          <Users size={18} />
          <h2 className="m-0 flex-1 font-display text-xl">Team</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 place-items-center rounded-[10px] border-2 border-butty-ink bg-butty-cream"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        {manager && (
          <AddTillPerson
            busy={busy}
            onError={setError}
            onAdded={() => void refresh()}
            setBusy={setBusy}
          />
        )}
        {error && (
          <p className="mt-2 mb-0 text-sm font-semibold text-butty-red">
            {error}
          </p>
        )}
        <div className="mt-3 overflow-hidden rounded-[14px] border-2 border-butty-ink">
          {people.length === 0 ? (
            <p className="m-0 px-3 py-4 text-sm text-butty-muted">
              No one on the till yet.
            </p>
          ) : (
            people.map((p, i) => (
              <div
                key={p.id}
                className={cn("px-3 py-3", i > 0 && "border-t-2 border-butty-ink")}
              >
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">{p.name}</div>
                    <div className="text-xs text-butty-muted">
                      {tillRoleLabel(p.tillRole)}
                      {p.onShift && p.clockInAt
                        ? ` · on since ${fmtLondonTime(p.clockInAt)}`
                        : ""}
                    </div>
                  </div>
                  {p.onShift && (
                    <span className="rounded-full bg-butty-green px-2 py-0.5 text-[10px] font-bold text-butty-cream uppercase">
                      On
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {p.onShift &&
                    p.id !== actor.id &&
                    canForceClockOut(actor.tillRole, p.tillRole) && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void run(() =>
                            forceClockOutTill({ data: { id: p.id } }),
                          )
                        }
                        className="rounded-[10px] border-2 border-butty-ink bg-butty-yellow px-3 py-2 text-xs font-bold"
                      >
                        Clock out
                      </button>
                    )}
                  {manager && (
                    <>
                      <RoleSelect
                        value={p.tillRole}
                        disabled={busy}
                        onChange={(tillRole) =>
                          void run(() =>
                            setStaffEmployeeRole({
                              data: { id: p.id, tillRole },
                            }),
                          )
                        }
                      />
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void run(() =>
                            setStaffEmployeeActive({
                              data: { id: p.id, active: false },
                            }),
                          )
                        }
                        className="rounded-[10px] border-2 border-butty-ink bg-butty-cream px-3 py-2 text-xs font-bold"
                      >
                        Take off till
                      </button>
                      <ResetPin
                        id={p.id}
                        busy={busy}
                        onError={setError}
                        run={run}
                      />
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function AddTillPerson({
  busy,
  onError,
  onAdded,
  setBusy,
}: {
  busy: boolean;
  onError: (m: string | null) => void;
  onAdded: () => void;
  setBusy: (v: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [tillRole, setTillRole] = useState<TillRole>("cashier");

  const save = async () => {
    onError(null);
    if (name.trim().length < 2) {
      onError("Need a name.");
      return;
    }
    if (!pinOk(pin)) {
      onError("Codes are 4 digits.");
      return;
    }
    setBusy(true);
    try {
      await addStaffEmployee({
        data: { name: name.trim(), pin, tillRole },
      });
      setName("");
      setPin("");
      setTillRole("cashier");
      onAdded();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Couldn't add them.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-2 rounded-[14px] border-2 border-butty-ink bg-butty-cream p-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        autoComplete="off"
        style={inpStyle}
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          value={pin}
          onChange={(e) => setPin(normalizePin(e.target.value))}
          placeholder="4-digit code"
          inputMode="numeric"
          autoComplete="off"
          style={inpStyle}
        />
        <RoleSelect value={tillRole} onChange={setTillRole} disabled={busy} />
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className="h-11 rounded-[10px] border-2 border-butty-ink bg-butty-yellow text-sm font-bold"
      >
        Add to till
      </button>
    </div>
  );
}

function RoleSelect({
  value,
  onChange,
  disabled,
}: {
  value: TillRole;
  onChange: (r: TillRole) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as TillRole)}
      className="h-11 rounded-[10px] border-2 border-butty-ink bg-butty-paper px-2 text-sm font-bold"
    >
      <option value="cashier">Cashier</option>
      <option value="shift_lead">Shift lead</option>
      <option value="manager">Manager</option>
    </select>
  );
}

function ResetPin({
  id,
  busy,
  onError,
  run,
}: {
  id: string;
  busy: boolean;
  onError: (m: string | null) => void;
  run: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [pin, setPin] = useState("");
  return (
    <form
      className="flex min-w-0 flex-1 gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!pinOk(pin)) {
          onError("Codes are 4 digits.");
          return;
        }
        void run(async () => {
          await setStaffEmployeePin({ data: { id, pin } });
          setPin("");
        });
      }}
    >
      <input
        value={pin}
        onChange={(e) => setPin(normalizePin(e.target.value))}
        placeholder="New code"
        inputMode="numeric"
        autoComplete="off"
        style={{ ...inpStyle, padding: "8px 10px", minWidth: 0 }}
      />
      <button
        type="submit"
        disabled={busy || pin.length < 4}
        className="shrink-0 rounded-[10px] border-2 border-butty-ink bg-butty-yellow px-3 text-xs font-bold"
      >
        Set code
      </button>
    </form>
  );
}
