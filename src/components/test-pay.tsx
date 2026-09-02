import { useState } from "react";
import { Check, CreditCard, Lock } from "lucide-react";
import { inpStyle, PrimaryButton } from "@/components/bits";
import { Logo } from "@/components/logo";

const TEST_PAN = "4242424242424242";

function digits(s: string) {
  return s.replace(/\D/g, "");
}

function formatPan(raw: string) {
  return digits(raw)
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatExpiry(raw: string) {
  const d = digits(raw).slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

function expiryOk(value: string) {
  const m = value.match(/^(\d{2})\/(\d{2})$/);
  if (!m) return false;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return false;
  const exp = new Date(year, month); // first of the following month
  return exp.getTime() > Date.now();
}

export function TestPay({
  total,
  onPaid,
  onBack,
}: {
  total: number;
  onPaid: () => Promise<void>;
  onBack: () => void;
}) {
  const [pan, setPan] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"form" | "busy" | "ok">("form");

  const fillTest = () => {
    setPan("4242 4242 4242 4242");
    setExpiry("12/30");
    setCvc("123");
    setError(null);
  };

  const submit = async () => {
    const panDigits = digits(pan);
    if (panDigits !== TEST_PAN) {
      setError("Test checkout only. Use 4242 4242 4242 4242.");
      return;
    }
    if (!expiryOk(expiry)) {
      setError("Use a future expiry, e.g. 12/30.");
      return;
    }
    if (digits(cvc).length !== 3) {
      setError("Enter a 3-digit CVC.");
      return;
    }
    setError(null);
    setPhase("busy");
    try {
      await onPaid();
      setPhase("ok");
    } catch (e) {
      setPhase("form");
      setError(e instanceof Error ? e.message : "Couldn't place that order.");
    }
  };

  return (
    <div className="min-h-[calc(100dvh-52px)] bg-butty-paper">
      <div className="bg-butty-ink px-4 py-2 text-center text-[11.5px] font-bold tracking-widest text-butty-yellow uppercase">
        Test mode · no real money
      </div>
      <div className="mx-auto max-w-sm px-5 py-6">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 text-[13px] font-semibold text-butty-muted"
        >
          ← Back to order
        </button>
        <Logo size={28} tagline={false} />
        <div className="mt-5 rounded-2xl border-[3px] border-butty-ink bg-butty-yellow p-5 text-center shadow-[5px_5px_0_var(--color-butty-ink)]">
          <div className="text-[11px] font-bold tracking-widest text-butty-ink/60 uppercase">
            Amount
          </div>
          <div className="font-display text-[34px] leading-none tabular-nums">
            £{total.toFixed(2)}
          </div>
          <div className="mt-1 text-[12.5px] font-semibold text-butty-ink/70">
            Collection at Butty & Co.
          </div>
        </div>

        {phase === "ok" ? (
          <div className="butty-pop mt-8 text-center">
            <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full border-[3px] border-butty-ink bg-butty-ok-bg">
              <Check size={28} className="text-butty-green" strokeWidth={3} />
            </div>
            <div className="font-display text-lg">Paid</div>
            <div className="mt-1 text-sm text-butty-muted">
              Ticket is going through to the kitchen.
            </div>
          </div>
        ) : (
          <>
            <div className="mt-6 flex items-center gap-2 text-[13.5px] font-bold">
              <CreditCard size={16} /> Card details
            </div>
            <p className="mt-1 text-[12.5px] leading-snug text-butty-muted">
              A live shop would send you to Stripe Checkout. Here, pay with the
              test card so the kitchen still gets a real ticket.
            </p>
            <label className="mt-4 block text-[12.5px] font-bold">
              Card number
              <input
                id="card-number"
                value={pan}
                onChange={(e) => setPan(formatPan(e.target.value))}
                placeholder="4242 4242 4242 4242"
                inputMode="numeric"
                autoComplete="cc-number"
                className="mt-1.5"
                style={inpStyle}
                aria-invalid={!!error}
              />
            </label>
            <div className="mt-3 flex gap-3">
              <label className="flex-1 text-[12.5px] font-bold">
                Expiry
                <input
                  id="card-exp"
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  placeholder="MM/YY"
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  className="mt-1.5"
                  style={inpStyle}
                />
              </label>
              <label className="flex-1 text-[12.5px] font-bold">
                CVC
                <input
                  id="card-cvc"
                  value={cvc}
                  onChange={(e) => setCvc(digits(e.target.value).slice(0, 3))}
                  placeholder="123"
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  className="mt-1.5"
                  style={inpStyle}
                />
              </label>
            </div>
            <button
              type="button"
              onClick={fillTest}
              className="mt-3 w-full rounded-xl border-2 border-dashed border-butty-ink bg-butty-cream py-2.5 text-[13px] font-bold"
            >
              Fill test card 4242…
            </button>
            {error && (
              <div className="mt-3 rounded-xl border-2 border-butty-red bg-butty-warn-bg px-3 py-2.5 text-[13px] font-semibold text-butty-red-deep">
                {error}
              </div>
            )}
            <PrimaryButton
              className="mt-5"
              disabled={phase === "busy"}
              onClick={() => void submit()}
            >
              {phase === "busy" ? "Taking payment…" : `Pay £${total.toFixed(2)}`}
            </PrimaryButton>
            <div className="mt-3 flex items-center justify-center gap-1.5 text-[11.5px] text-butty-faint">
              <Lock size={12} /> Card details stay on this screen. Never stored.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
