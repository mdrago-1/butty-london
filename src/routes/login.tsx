import { useState } from "react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import {
  GROK_PROVIDERS,
  authClient,
  authEnabled,
  signIn,
} from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { inpStyle, PrimaryButton } from "@/components/bits";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/cn";

export const Route = createFileRoute("/login")({
  component: Login,
  head: () => ({
    meta: [{ title: "Sign in — Butty & Co." }],
  }),
});

function Login() {
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<string | null>(null);

  if (!isPending && user) return <Navigate to="/" />;

  const onOauth = async (providerId: string) => {
    setError(null);
    setOauthBusy(providerId);
    try {
      await signIn(providerId, { callbackURL: "/", errorCallbackURL: "/login" });
    } catch (e) {
      setOauthBusy(null);
      setError(e instanceof Error ? e.message : "Sign-in didn't complete.");
    }
  };

  const onEmail = async () => {
    setError(null);
    if (!email.trim() || password.length < 8) {
      setError("Use a real email and a password of at least 8 characters.");
      return;
    }
    if (mode === "up" && name.trim().length < 2) {
      setError("Tell us what to call you on the ticket.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "up") {
        const { error: err } = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: name.trim(),
        });
        if (err) throw new Error(err.message || "Couldn't create that account.");
      } else {
        const { error: err } = await authClient.signIn.email({
          email: email.trim(),
          password,
        });
        if (err) throw new Error(err.message || "Email or password didn't match.");
      }
      await authClient.getSession();
      window.location.href = "/";
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  };

  return (
    <main className="min-h-dvh bg-butty-yellow px-4 py-8">
      <div className="mx-auto w-full max-w-[420px]">
        <Logo size={40} />
        <div className="mt-6 rounded-[22px] border-[3px] border-butty-ink bg-butty-paper p-5 shadow-[4px_4px_0_var(--color-butty-ink)]">
          <h1 className="m-0 font-display text-2xl leading-none">Sign in</h1>
          <p className="mt-2 text-sm leading-snug text-butty-muted">
            Save your orders across devices and join the Butty Club for stamps
            toward a free sandwich.
          </p>

          {!authEnabled ? (
            <p className="mt-4 text-sm text-butty-muted">Sign-in is disabled.</p>
          ) : (
            <>
              <div className="mt-5 grid gap-2.5">
                {GROK_PROVIDERS.map((p) => (
                  <button
                    key={p.providerId}
                    type="button"
                    disabled={!!oauthBusy}
                    onClick={() => void onOauth(p.providerId)}
                    className={cn(
                      "w-full rounded-xl border-2 border-butty-ink bg-butty-cream px-4 py-3 text-[15px] font-bold",
                      oauthBusy === p.providerId && "opacity-70",
                    )}
                  >
                    {oauthBusy === p.providerId
                      ? "Opening…"
                      : `Continue with ${p.label}`}
                  </button>
                ))}
              </div>

              <div className="my-5 flex items-center gap-3 text-[11px] font-semibold tracking-widest text-butty-faint uppercase">
                <span className="h-px flex-1 bg-butty-line" />
                or email
                <span className="h-px flex-1 bg-butty-line" />
              </div>

              <div className="mb-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode("in")}
                  className={cn(
                    "flex-1 rounded-full border-2 border-butty-ink px-3 py-2 text-sm font-semibold",
                    mode === "in"
                      ? "bg-butty-red text-butty-cream"
                      : "bg-butty-paper",
                  )}
                >
                  I have an account
                </button>
                <button
                  type="button"
                  onClick={() => setMode("up")}
                  className={cn(
                    "flex-1 rounded-full border-2 border-butty-ink px-3 py-2 text-sm font-semibold",
                    mode === "up"
                      ? "bg-butty-red text-butty-cream"
                      : "bg-butty-paper",
                  )}
                >
                  Create one
                </button>
              </div>

              {mode === "up" && (
                <label className="mb-2.5 block">
                  <span className="mb-1.5 block text-[12.5px] font-bold">
                    Name on the ticket
                  </span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sam"
                    autoComplete="name"
                    style={inpStyle}
                  />
                </label>
              )}
              <label className="mb-2.5 block">
                <span className="mb-1.5 block text-[12.5px] font-bold">Email</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  type="email"
                  autoComplete="email"
                  style={inpStyle}
                />
              </label>
              <label className="mb-3 block">
                <span className="mb-1.5 block text-[12.5px] font-bold">
                  Password
                </span>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  type="password"
                  autoComplete={
                    mode === "up" ? "new-password" : "current-password"
                  }
                  style={inpStyle}
                />
              </label>

              {error && (
                <div className="mb-3 rounded-xl border-2 border-butty-red bg-butty-warn-bg px-3 py-2.5 text-[13px] font-semibold text-butty-red-deep">
                  {error}
                </div>
              )}

              <PrimaryButton disabled={busy} onClick={() => void onEmail()}>
                {busy
                  ? "Just a moment…"
                  : mode === "up"
                    ? "Create account"
                    : "Sign in with email"}
              </PrimaryButton>
            </>
          )}
        </div>

        <Link
          to="/"
          className="mt-5 block text-center text-sm font-semibold text-butty-ink underline decoration-butty-ink/30 underline-offset-4"
        >
          Continue as guest — no stamps
        </Link>
      </div>
    </main>
  );
}
