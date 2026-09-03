import { useState, useSyncExternalStore } from "react";
import { LogOut, RotateCcw } from "lucide-react";
import { inpStyle, PrimaryButton, ScreenHead, SubHead } from "@/components/bits";
import { StampCard } from "@/components/stamp-card";
import { authEnabled, signOut } from "@/lib/auth/client";
import { hasGateSessionMarker } from "@/lib/auth/gate-session-marker";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/cn";
import { fmtDate } from "@/lib/format";
import { saveClubPhone } from "@/lib/loyalty-api";
import type { LoyaltyProfile } from "@/lib/loyalty";
import type { Order, OrderLine } from "@/lib/types";

const subscribeToNothing = () => () => {};
const noGateSessionOnServer = () => false;

export function AccountScreen({
  profile,
  orders,
  myOrderNo,
  onBack,
  onOptIn,
  onSaveName,
  reorder,
  lineUnavailable,
}: {
  profile: LoyaltyProfile | null;
  orders: Order[];
  myOrderNo: number | null;
  onBack: () => void;
  onOptIn: (optedIn: boolean, displayName?: string) => Promise<void>;
  onSaveName: (name: string) => Promise<void>;
  reorder: (o: Order) => void;
  lineUnavailable: (l: OrderLine) => string | null;
}) {
  const user = useCurrentUser();
  const [name, setName] = useState(
    profile?.displayName || user?.displayName || "",
  );
  const [phone, setPhone] = useState(profile?.phone || "");
  const [phoneMsg, setPhoneMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const gateSession = useSyncExternalStore(
    subscribeToNothing,
    hasGateSessionMarker,
    noGateSessionOnServer,
  );
  const label = profile?.displayName || user?.displayName || "You";
  const email = profile?.email || user?.primaryEmail;

  const join = async () => {
    setBusy(true);
    try {
      await onOptIn(true, name.trim());
    } finally {
      setBusy(false);
    }
  };
  const pause = async () => {
    setBusy(true);
    try {
      await onOptIn(false);
    } finally {
      setBusy(false);
    }
  };
  const saveName = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onSaveName(name.trim());
    } finally {
      setBusy(false);
    }
  };
  const savePhone = async () => {
    setBusy(true);
    setPhoneMsg(null);
    try {
      const next = await saveClubPhone({ data: { phone } });
      setPhone(next.phone || "");
      setPhoneMsg("Saved — staff can find you at the counter with this number.");
    } catch (e) {
      setPhoneMsg(e instanceof Error ? e.message : "Couldn't save that number.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pb-10">
      <ScreenHead
        title="Your account"
        onBack={onBack}
        extra={
          authEnabled && !gateSession ? (
            <button
              type="button"
              disabled={signingOut}
              onClick={() => {
                setSigningOut(true);
                void signOut().catch(() => setSigningOut(false));
              }}
              className="ml-auto flex items-center gap-1.5 rounded-full border-2 border-butty-ink bg-butty-paper px-3 py-1.5 text-[12.5px] font-semibold"
            >
              <LogOut size={13} />
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          ) : null
        }
      />

      <div className="px-[18px] py-[18px]">
        <div className="mb-4 flex items-center gap-2.5 rounded-[14px] bg-butty-ink px-[15px] py-3 text-butty-cream">
          {user?.profileImageUrl ? (
            <img
              src={user.profileImageUrl}
              alt=""
              className="size-10 rounded-full object-cover"
            />
          ) : (
            <div className="grid size-10 place-items-center rounded-full bg-butty-yellow font-display font-bold text-butty-ink">
              {label[0]?.toUpperCase() || "B"}
            </div>
          )}
          <div className="min-w-0">
            <div className="truncate font-bold">{label}</div>
            {email && (
              <div className="truncate text-[12.5px] opacity-70">{email}</div>
            )}
          </div>
        </div>

        <SubHead>Name on the ticket</SubHead>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sam"
            style={inpStyle}
          />
          <button
            type="button"
            disabled={busy || name.trim().length < 2}
            onClick={() => void saveName()}
            className="shrink-0 rounded-[10px] border-2 border-butty-ink bg-butty-yellow px-3 text-sm font-bold"
          >
            Save
          </button>
        </div>

        <SubHead>Mobile for the counter</SubHead>
        <p className="mt-0 mb-2 text-[13px] text-butty-muted">
          Give this to staff if you order at the till, so stamps go on your
          card.
        </p>
        <div className="flex gap-2">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="07…"
            inputMode="tel"
            autoComplete="tel"
            style={inpStyle}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void savePhone()}
            className="shrink-0 rounded-[10px] border-2 border-butty-ink bg-butty-yellow px-3 text-sm font-bold"
          >
            Save
          </button>
        </div>
        {phoneMsg && (
          <p className="mt-2 mb-0 text-[13px] font-semibold">{phoneMsg}</p>
        )}

        <div className="mt-6 rounded-[18px] border-[3px] border-butty-ink bg-butty-paper p-4">
          <div className="font-display text-lg leading-none">The Butty Club</div>
          <p className="mt-2 mb-3 text-[13.5px] leading-snug text-butty-muted">
            Every sandwich you buy adds a stamp. Collect 9 and the 10th is
            free — drinks don’t count.
          </p>

          {profile?.optedIn ? (
            <>
              <div className="mb-4">
                <p className="mt-0 mb-3 text-[13.5px] font-semibold leading-snug text-butty-muted">
                  {profile.canRedeem
                    ? profile.rewardsReady > 1
                      ? `${profile.rewardsReady} free sandwiches waiting — redeem at checkout.`
                      : "Reward ready — your next sandwich is free at checkout."
                    : `${profile.remainingToReward} sandwich${profile.remainingToReward === 1 ? "" : "es"} to a free one.`}
                </p>
              </div>
              <StampCard stamps={profile.card} ready={profile.canRedeem} />
              <button
                type="button"
                disabled={busy}
                onClick={() => void pause()}
                className="mt-3 w-full border-none bg-transparent py-2 text-[12.5px] font-semibold text-butty-muted underline decoration-butty-line underline-offset-2"
              >
                Pause stamps — keep your balance
              </button>
            </>
          ) : (
            <>
              <StampCard stamps={0} />
              <PrimaryButton className="mt-4" disabled={busy} onClick={() => void join()}>
                {busy ? "Joining…" : "Join the Butty Club"}
              </PrimaryButton>
              <p className="mt-2 mb-0 text-center text-[11.5px] text-butty-faint">
                You can pause anytime. Stamps stay on this account.
              </p>
            </>
          )}
        </div>

        {profile?.optedIn && profile.events.length > 0 && (
          <>
            <SubHead>Stamp activity</SubHead>
            <div className="grid gap-1.5">
              {profile.events.slice(0, 8).map((e) => (
                <div
                  key={e.id}
                  className="flex items-baseline justify-between rounded-xl bg-butty-cream px-3 py-2 text-[13px]"
                >
                  <span className="text-butty-ink">{e.note || e.kind}</span>
                  <span
                    className={cn(
                      "font-bold tabular-nums",
                      e.points > 0
                        ? "text-butty-green"
                        : e.points < 0
                          ? "text-butty-red"
                          : "text-butty-muted",
                    )}
                  >
                    {e.points > 0 ? `+${e.points}` : e.points === 0 ? "" : e.points}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        <SubHead>Your orders</SubHead>
        {orders.length === 0 ? (
          <div className="rounded-[14px] border-2 border-dashed border-butty-ink bg-butty-paper px-8 py-8 text-center text-sm text-butty-muted">
            No orders on this account yet. Once you order, they'll show here
            for one-tap reordering.
          </div>
        ) : (
          <div className="grid gap-3">
            {orders.map((o) => {
              const oTotal = o.lines.reduce((s, l) => s + l.linePrice, 0);
              const anyUnavailable = o.lines.some((l) => lineUnavailable(l));
              const isLive = o.no === myOrderNo && !o.collected;
              return (
                <div
                  key={o.id || o.no + "-" + o.at}
                  className="rounded-[14px] border-2 border-butty-ink bg-butty-paper p-3.5"
                >
                  <div className="flex items-baseline justify-between">
                    <div className="text-sm font-bold">
                      #{o.no}
                      {isLive && (
                        <span className="text-butty-red"> · in progress</span>
                      )}
                      {o.collected && (
                        <span className="text-butty-green"> · collected</span>
                      )}
                    </div>
                    <div className="text-xs text-butty-faint">{fmtDate(o.at)}</div>
                  </div>
                  <div className="mt-2 grid gap-1">
                    {o.lines.map((l, i) => (
                      <div key={i} className="text-[13.5px]">
                        <span className="font-semibold">
                          {l.qty > 1 ? `${l.qty}× ` : ""}
                          {l.name}
                        </span>
                        {l.mods.length > 0 && (
                          <span className="text-butty-muted">
                            {" "}
                            — {l.mods.join(", ")}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold tabular-nums text-butty-red-deep">
                        £{(oTotal - (o.discountGbp || 0)).toFixed(2)}
                      </div>
                      {!!o.pointsEarned && (
                        <div className="text-[11.5px] font-semibold text-butty-green">
                          +{o.pointsEarned} stamp{o.pointsEarned === 1 ? "" : "s"}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => reorder(o)}
                      className="flex items-center gap-1.5 rounded-[10px] bg-butty-red px-[15px] py-[9px] text-[13.5px] font-bold text-butty-cream shadow-[0_4px_0_var(--color-butty-red-deep)]"
                    >
                      <RotateCcw size={14} /> Reorder
                    </button>
                  </div>
                  {anyUnavailable && (
                    <div className="mt-2 text-[11.5px] text-butty-warn">
                      Some items may be unavailable right now — we'll tell you
                      which when you reorder.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
