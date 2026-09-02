import { useEffect, useState, type ReactNode } from "react";
import { Lock, LogOut } from "lucide-react";
import { Logo, Splash } from "@/components/logo";
import { inpStyle, PrimaryButton } from "@/components/bits";
import { getStaffSession, staffLogin, staffLogout } from "@/lib/staff-api";
import type { StaffRole } from "@/lib/staff";
import { useShop } from "@/lib/store";

export function ShopLive({ children }: { children: ReactNode }) {
  const refresh = useShop((s) => s.refresh);
  useEffect(() => {
    void refresh();
    const t = window.setInterval(() => {
      void useShop.getState().refresh();
    }, 2000);
    return () => window.clearInterval(t);
  }, [refresh]);
  return <>{children}</>;
}

export function StaffGate({
  role,
  title,
  hint,
  children,
}: {
  role: StaffRole;
  title: string;
  hint: string;
  children: ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    void getStaffSession().then((s) => {
      if (!live) return;
      setAuthed(s?.role === role);
      setReady(true);
    });
    return () => {
      live = false;
    };
  }, [role]);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const s = await staffLogin({ data: { role, password } });
      if (s.role !== role) throw new Error("Wrong screen for that login.");
      setAuthed(true);
      setPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't sign in.");
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await staffLogout();
    setAuthed(false);
  };

  if (!ready) return <Splash />;

  if (!authed) {
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
                  if (e.key === "Enter") void submit();
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
              onClick={() => void submit()}
            >
              {busy ? "Checking…" : "Unlock"}
            </PrimaryButton>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="relative min-h-dvh bg-butty-yellow font-sans text-butty-ink">
      <button
        type="button"
        onClick={() => void signOut()}
        className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-full border-2 border-butty-ink bg-butty-paper px-3 py-1.5 text-xs font-bold"
      >
        <LogOut size={13} /> Sign out
      </button>
      <ShopLive>{children}</ShopLive>
    </div>
  );
}
