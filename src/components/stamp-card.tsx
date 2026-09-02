import { Check, Star } from "lucide-react";
import { cn } from "@/lib/cn";
import { STAMPS_FOR_REWARD } from "@/lib/loyalty";

export function StampCard({
  stamps,
  ready,
}: {
  stamps: number;
  ready?: boolean;
}) {
  const filled = Math.min(STAMPS_FOR_REWARD, Math.max(0, stamps));
  return (
    <div
      className={cn(
        "rounded-[18px] border-[3px] border-butty-ink bg-butty-cream p-3.5",
        ready && "shadow-[4px_4px_0_var(--color-butty-red)]",
      )}
    >
      <div className="mb-2.5 flex items-baseline justify-between">
        <div className="font-display text-sm">Buy 9, get 1 free</div>
        <div className="text-xs font-semibold text-butty-muted">
          {filled} / {STAMPS_FOR_REWARD}
        </div>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: STAMPS_FOR_REWARD }, (_, i) => {
          const on = i < filled;
          return (
            <div
              key={i}
              className={cn(
                "grid aspect-square place-items-center rounded-full border-2 border-butty-ink",
                on ? "bg-butty-red text-butty-cream" : "bg-butty-paper",
              )}
              aria-label={
                on ? `Stamp ${i + 1} collected` : `Stamp ${i + 1} empty`
              }
            >
              {on && <Check size={16} strokeWidth={3} />}
            </div>
          );
        })}
        <div
          className={cn(
            "grid aspect-square place-items-center rounded-full border-2 border-dashed border-butty-ink",
            ready
              ? "bg-butty-yellow text-butty-ink"
              : "bg-butty-paper text-butty-muted",
          )}
          aria-label={ready ? "Free sandwich ready" : "Free sandwich"}
        >
          <Star size={16} strokeWidth={2.6} fill={ready ? "currentColor" : "none"} />
        </div>
      </div>
      <p className="mt-2.5 mb-0 text-center text-xs font-semibold text-butty-muted">
        {ready
          ? "Card full — your next sandwich is on us."
          : "Each sandwich is a stamp. Fill nine, the tenth is free."}
      </p>
    </div>
  );
}
