import { MapPin, Navigation } from "lucide-react";
import {
  SHOP_ADDRESS_LINE,
  SHOP_AREA,
  SHOP_MAPS_DIR,
  SHOP_MAPS_EMBED,
  SHOP_MAPS_SEARCH,
  SHOP_NAME_DISPLAY,
  SHOP_POSTCODE,
  SHOP_STREET,
} from "@/lib/venue";

export function FindUs({ compact = false }: { compact?: boolean }) {
  return (
    <section
      className={
        compact
          ? "px-5 py-6 text-center"
          : "mx-4 mt-4 overflow-hidden rounded-[16px] border-2 border-butty-ink bg-butty-paper"
      }
    >
      {!compact && (
        <iframe
          title={`${SHOP_NAME_DISPLAY} on Google Maps`}
          src={SHOP_MAPS_EMBED}
          className="block h-44 w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      )}
      <div className={compact ? "" : "px-4 py-3.5"}>
        <div className="flex items-start justify-center gap-2 text-sm font-bold">
          <MapPin size={16} className="mt-0.5 shrink-0" />
          <span>
            {SHOP_STREET}
            <br />
            {SHOP_AREA}, {SHOP_POSTCODE}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <a
            href={SHOP_MAPS_DIR}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-butty-ink bg-butty-yellow px-3.5 py-2 text-xs font-bold text-butty-ink no-underline"
          >
            <Navigation size={13} /> Directions
          </a>
          <a
            href={SHOP_MAPS_SEARCH}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-butty-ink bg-butty-cream px-3.5 py-2 text-xs font-bold text-butty-ink no-underline"
          >
            Open in Maps
          </a>
        </div>
        {compact && (
          <p className="mt-3 mb-0 text-xs text-butty-faint">{SHOP_ADDRESS_LINE}</p>
        )}
      </div>
    </section>
  );
}
