import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { MENU_PLACEHOLDER, menuPhotoUrl } from "@/lib/menu";

export function MenuPhoto({
  item,
  alt,
  soldOut,
  size = "card",
  className,
}: {
  item?: { id?: string; photo?: string | null; name?: string } | null;
  alt?: string;
  soldOut?: boolean;
  size?: "card" | "hero" | "thumb";
  className?: string;
}) {
  const next = menuPhotoUrl(item);
  const [src, setSrc] = useState(next);

  useEffect(() => {
    setSrc(next);
  }, [next]);

  const label = alt ?? item?.name ?? "";
  const box =
    size === "thumb"
      ? "size-12 shrink-0 rounded-[10px]"
      : size === "hero"
        ? "aspect-square w-full rounded-[18px]"
        : "aspect-square w-full";

  return (
    <div className={cn("relative overflow-hidden bg-butty-yellow", box, className)}>
      <img
        src={src}
        alt={label}
        className={cn(
          "size-full object-cover outline outline-1 -outline-offset-1 outline-butty-ink/15",
          soldOut && "opacity-40",
        )}
        onError={() => {
          if (src !== MENU_PLACEHOLDER) setSrc(MENU_PLACEHOLDER);
        }}
      />
      {soldOut && size !== "thumb" && (
        <span className="absolute bottom-2 left-2 rounded-full bg-butty-ink px-2.5 py-1 text-[11px] font-bold text-butty-cream">
          Sold out
        </span>
      )}
    </div>
  );
}
