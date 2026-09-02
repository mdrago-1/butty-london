import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/cn";

export function Logo({
  size = 42,
  tagline = true,
  align = "center",
  onClick,
}: {
  size?: number;
  tagline?: boolean;
  align?: "center" | "start";
  onClick?: () => void;
}) {
  const width = size * 6.2;
  return (
    <Link
      to="/"
      onClick={onClick}
      aria-label="Butty & Co. home"
      className={cn(
        "block text-inherit no-underline",
        align === "center" ? "text-center" : "text-left",
      )}
    >
      <div
        className={cn(
          "flex max-w-full items-center gap-3",
          align === "center" ? "mx-auto justify-center" : "justify-start",
        )}
        style={{ width, maxWidth: "100%" }}
      >
        <img
          src="/butty-mark.jpg"
          alt=""
          width={Math.round(size * 1.25)}
          height={Math.round(size * 1.25)}
          className="shrink-0 rounded-full border-[2.5px] border-butty-ink shadow-[2px_2px_0_var(--color-butty-ink)]"
          style={{
            width: size * 1.25,
            height: size * 1.25,
            objectFit: "cover",
          }}
        />
        <div className="min-w-0 text-left">
          <div
            className="font-logo leading-none text-butty-red"
            style={{ fontSize: size * 0.82 }}
          >
            Butty & Co.
          </div>
          {tagline && (
            <div
              className="font-tag mt-1 font-semibold tracking-wide text-butty-red"
              style={{ fontSize: size * 0.26 }}
            >
              Sandwich & Juice Bar
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center bg-butty-yellow px-6">
      <div className="butty-pop">
        <Logo size={52} />
        <p className="mt-6 text-center text-sm font-semibold text-butty-red">
          Loading the counter…
        </p>
      </div>
    </div>
  );
}

export function BackButton({
  onClick,
  label = "Back",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-[10px]",
        "border-2 border-butty-ink bg-butty-paper",
      )}
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
  );
}
