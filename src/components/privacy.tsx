import { ScreenHead } from "@/components/bits";

export function Privacy({ onBack }: { onBack: () => void }) {
  return (
    <div className="pb-10">
      <ScreenHead title="Privacy & allergens" onBack={onBack} />
      <div className="space-y-5 px-[18px] py-[18px] text-[13.5px] leading-relaxed text-butty-ink">
        <p className="m-0 text-butty-muted">
          Butty & Co. · 19 Replingham Road, Southfields, SW18 5LT. A short,
          honest note on what this ordering app keeps — and what it doesn't.
        </p>

        <section>
          <h2 className="m-0 font-display text-sm">What we keep</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>
              The name you give at checkout, so the kitchen can call it when
              your order is ready.
            </li>
            <li>
              What you ordered, so we can make it and so you can reorder.
            </li>
            <li>
              If you sign in: your account (name and email from Google, X, or
              the address you typed) so orders follow you across devices.
            </li>
            <li>
              If you opt in to the Butty Club: your stamp balance and a short
              log of points earned or redeemed. You can pause anytime — the
              balance stays on the account.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="m-0 font-display text-sm">What we don't keep</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>
              Card numbers. Checkout here is a test page. In a live shop,
              you'd type your card on Stripe's own page — never ours.
            </li>
            <li>Marketing lists. We don't pass your details on.</li>
            <li>
              Loyalty data unless you join the club. Signing in does not
              enrol you — that's a separate, optional step.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="m-0 font-display text-sm">Allergens</h2>
          <p className="mt-2">
            Every item lists the main allergens we know about. That has to match
            what's actually in the sandwich (Natasha's Law / FSA
            rules). If you have an allergy, tell us when you collect — tags in
            the app are a guide, not a substitute for asking.
          </p>
        </section>

        <section>
          <h2 className="m-0 font-display text-sm">If we get it wrong</h2>
          <p className="mt-2">
            Collection only. If we pack the wrong thing, say so at the counter
            and we'll remake it or refund you. A live shop would refund
            through Stripe; here there's no real money moving.
          </p>
        </section>

        <p className="text-[12.5px] text-butty-faint">
          A real shop taking orders online should register with the ICO. This
          preview is for trying the shop, not for handling anyone's real
          personal data.
        </p>
      </div>
    </div>
  );
}
