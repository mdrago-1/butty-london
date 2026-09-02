import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function ScreenHead({
  title,
  onBack,
  extra,
}: {
  title: string;
  onBack?: () => void;
  extra?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 border-b-[3px] border-butty-ink bg-butty-yellow px-[18px] py-4">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="grid size-11 shrink-0 place-items-center rounded-[10px] border-2 border-butty-ink bg-butty-paper"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M19 12H5M12 19l-7-7 7-7"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
      <h1 className="m-0 font-display text-xl leading-none">{title}</h1>
      {extra}
    </div>
  );
}

export function Chip({
  on,
  onClick,
  children,
  className,
}: {
  on?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border-2 border-butty-ink px-[15px] py-[9px] text-sm font-semibold",
        on ? "bg-butty-red text-butty-cream" : "bg-butty-paper text-butty-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function QtyBtn({
  onClick,
  large,
  children,
}: {
  onClick: () => void;
  large?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "grid place-items-center border-2 border-butty-ink bg-butty-yellow",
        large ? "size-11 rounded-[10px]" : "size-[30px] rounded-lg",
      )}
    >
      {children}
    </button>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "w-full rounded-2xl border-none px-5 py-[17px] text-base font-bold text-butty-cream",
        disabled
          ? "bg-butty-disabled shadow-none"
          : "bg-butty-red shadow-[0_6px_0_var(--color-butty-red-deep)]",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-1.5 text-[12.5px] font-bold text-butty-ink">{label}</div>
      {children}
    </div>
  );
}

export const inpStyle: CSSProperties = {
  width: "100%",
  padding: "12px 13px",
  border: "2px solid var(--color-butty-ink)",
  borderRadius: 10,
  fontSize: 14.5,
  background: "var(--color-butty-paper)",
  outline: "none",
  color: "var(--color-butty-ink)",
};

export function SubHead({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-2.5 mt-[22px] font-display text-sm">{children}</h3>
  );
}
