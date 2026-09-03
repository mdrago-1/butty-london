import { useState } from "react";
import { inpStyle, PrimaryButton } from "@/components/bits";
import { setStaffPassword } from "@/lib/staff-api";
import type { StaffRole } from "@/lib/staff";

function PasswordForm({
  role,
  title,
  needsCurrent,
}: {
  role: StaffRole;
  title: string;
  needsCurrent?: boolean;
}) {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setErr(null);
    setMsg(null);
    if (password.length < 6) {
      setErr("Use at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setErr("Those new passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      await setStaffPassword({
        data: { role, password, current: needsCurrent ? current : undefined },
      });
      setMsg("Saved.");
      setCurrent("");
      setPassword("");
      setConfirm("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save that password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-[16px] border-2 border-butty-ink bg-butty-paper p-4">
      <div className="font-display text-sm">{title}</div>
      {needsCurrent && (
        <label className="mt-3 block text-xs font-bold tracking-widest text-butty-muted uppercase">
          Current office password
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            style={inpStyle}
          />
        </label>
      )}
      <label className="mt-3 block text-xs font-bold tracking-widest text-butty-muted uppercase">
        New password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inpStyle}
        />
      </label>
      <label className="mt-3 block text-xs font-bold tracking-widest text-butty-muted uppercase">
        Confirm
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          style={inpStyle}
        />
      </label>
      {err && <p className="mt-2 mb-0 text-sm font-semibold text-butty-red">{err}</p>}
      {msg && <p className="mt-2 mb-0 text-sm font-semibold text-butty-green">{msg}</p>}
      <PrimaryButton className="mt-3" disabled={busy} onClick={() => void save()}>
        {busy ? "Saving…" : "Save password"}
      </PrimaryButton>
    </div>
  );
}

export function StaffPasswords() {
  return (
    <section className="mt-8">
      <h2 className="m-0 font-display text-base">Staff passwords</h2>
      <p className="mt-1 mb-3 text-[13px] text-butty-muted">
        Kitchen and back office still use these shared passwords. The till
        uses each person’s own code — set those under Staff.
      </p>
      <div className="grid gap-3">
        <PasswordForm role="kitchen" title="Kitchen screen" />
        <PasswordForm role="manager" title="Back office" needsCurrent />
      </div>
    </section>
  );
}
