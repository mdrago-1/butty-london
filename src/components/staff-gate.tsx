import { useEffect, useState, type ReactNode } from "react";
import { Delete, Lock, LogOut } from "lucide-react";
import { Logo, Splash } from "@/components/logo";
import { inpStyle, PrimaryButton } from "@/components/bits";
import { cn } from "@/lib/cn";
import {
  getStaffSession,
  staffLogin,
  staffLogout,
  staffPinLogin,
} from "@/lib/staff-api";
import {
  fmtLondonTime,
  normalizePin,
  type StaffRole,
  type StaffSession,
} from "@/lib/staff";
import { useShop } from "@/lib/store";

export function ShopLive({ children }: { children: ReactNode }) {
  const refresh = useShop((s) => s.refresh);
  const shopReady = useShop((s) => s.ready);
  useEffect(() => {
    void refresh();
    const t = window.setInterval(() => {
      void useShop.getState().refresh();
    }, 2000);
    return () => window.clearInterval(t);
  }, [refresh]);
  if (!shopReady) return <Splash />;
  return <>{children}</>;
}

export function StaffGate({
  role,
  title,
  hint,
  children,
  eitherStaff = false,
  pin = false,
}: {
  role: StaffRole;
  title: string;
  hint: string;
  children: ReactNode;
  eitherStaff?: boolean;
  pin?: boolean;
}) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<StaffSession | null>(null);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const tillIdle = !!session?.till && !session?.employeeId;
  const authed = pin
    ? !!session?.employeeId
    : tillIdle
      ? false
      : eitherStaff
        ? session?.role === "kitchen" || session?.role === "manager"
        : session?.role === role;

  useEffect(() => {
    let live = true;
    void getStaffSession().then((s) => {
      if (!live) return;
      setSession(s);
      setReady(true);
    });
    return () => {
      live = false;
    };
  }, [role, eitherStaff, pin]);

  const submitPassword = async () => {
    setError(null);
    setBusy(true);
    try {
      if (eitherStaff) {
        try {
          await staffLogin({ data: { role: "kitchen", password } });
        } catch {
          await staffLogin({ data: { role: "manager", password } });
        }
        setSession(await getStaffSession());
        setPassword("");
        return;
      }
      const s = await staffLogin({ data: { role, password } });
      if (s.role !== role) throw new Error("Wrong screen for that login.");
      setSession(s);
      setPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't sign in.");
    } finally {
      setBusy(false);
    }
  };

  const submitPin = async (raw: string) => {
    const pinValue = normalizePin(raw);
    if (pinValue.length < 4) return;
    setError(null);
    setBusy(true);
    try {
      const s = await staffPinLogin({ data: { pin: pinValue } });
      setSession(s);
      setCode("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't sign in.");
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  const signOut = async (endShift: boolean) => {
    await staffLogout({ data: { endShift } });
    setSession(null);
    setCode("");
  };

  if (!ready) return <Splash />;

  if (!authed) {
    if (pin) {
      return (
        <PinUnlock
          title={title}
          hint={hint}
          code={code}
          setCode={setCode}
          error={error}
          busy={busy}
          onSubmit={submitPin}
        />
      );
    }
    return (
      <main className="min-h-dvh bg-butty-yellow px-4 py-8">
        <div className="mx-auto w-full max-w-[420px]">
          <Logo size={40} />
          <div className="mt-6 rounded-[22px] border-[3px] border-butty-ink bg-butty-paper p-5 shadow-[4px_4px_0_var(--color-butty-ink)]">
            <div className="flex items-center gap-2">
              <Lock size={18} />
              <h1 className="m-0 font-display text-2xl leading-none">{title}</h1>
            </div>
            <p className="mt-2 text-sm leading-snug text-butty-muted">{hint}</p>
            <label className="mt-5 block text-xs font-bold tracking-widest text-butty-muted uppercase">
              Password
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void submitPassword();
                }}
                style={inpStyle}
                className="mt-2"
              />
            </label>
            {error && (
              <p className="mt-3 mb-0 text-sm font-semibold text-butty-red">
                {error}
              </p>
            )}
            <PrimaryButton
              className="mt-4"
              disabled={busy || password.length < 6}
              onClick={() => void submitPassword()}
            >
              {busy ? "Checking…" : "Unlock"}
            </PrimaryButton>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-butty-yellow font-sans text-butty-ink">
      <div className="flex shrink-0 items-center justify-end gap-2 px-3 py-2">
        {session?.employeeName && (
          <div className="mr-auto truncate text-sm font-bold">
            {session.employeeName}
            {session.clockInAt ? (
              <span className="font-semibold text-butty-muted">
                {" "}
                · in since {fmtLondonTime(session.clockInAt)}
              </span>
            ) : null}
          </div>
        )}
        <button
          type="button"
          onClick={() => void signOut(pin)}
          className="flex items-center gap-1.5 rounded-full border-2 border-butty-ink bg-butty-paper px-3 py-1.5 text-xs font-bold"
        >
          <LogOut size={13} /> {pin ? "End shift" : "Sign out"}
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <ShopLive>{children}</ShopLive>
      </div>
    </div>
  );
}

function PinUnlock({
  title,
  hint,
  code,
  setCode,
  error,
  busy,
  onSubmit,
}: {
  title: string;
  hint: string;
  code: string;
  setCode: (v: string) => void;
  error: string | null;
  busy: boolean;
  onSubmit: (pin: string) => void;
}) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "del", "0", "go"];

  const tap = (k: string) => {
    if (busy) return;
    if (k === "del") {
      setCode(code.slice(0, -1));
      return;
    }
    if (k === "go") {
      void onSubmit(code);
      return;
    }
    const next = normalizePin(code + k);
    setCode(next);
    if (next.length === 6) void onSubmit(next);
  };

  return (
    <main className="min-h-dvh bg-butty-yellow px-4 py-8">
      <div className="mx-auto w-full max-w-[380px]">
        <Logo size={40} />
        <div className="mt-6 rounded-[22px] border-[3px] border-butty-ink bg-butty-paper p-5 shadow-[4px_4px_0_var(--color-butty-ink)]">
          <div className="flex items-center gap-2">
            <Lock size={18} />
            <h1 className="m-0 font-display text-2xl leading-none">{title}</h1>
          </div>
          <p className="mt-2 text-sm leading-snug text-butty-muted">{hint}</p>
          <div
            className="mt-5 flex min-h-14 items-center justify-center gap-2 rounded-[14px] border-2 border-butty-ink bg-butty-cream"
            aria-label="Code"
          >
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <span
                key={i}
                className={cn(
                  "size-3 rounded-full border-2 border-butty-ink",
                  i < code.length ? "bg-butty-ink" : "bg-transparent",
                  i > 3 && i >= code.length && code.length <= 4 && "opacity-40",
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
                aria-label={
                  k === "del" ? "Delete" : k === "go" ? "Unlock" : k
                }
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
          <p className="mt-4 mb-0 text-center text-xs text-butty-muted">
            Codes are set in the office, under Staff.
          </p>
        </div>
      </div>
    </main>
  );
}
