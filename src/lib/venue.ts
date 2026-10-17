import { SECTION_ORDER } from "@/lib/menu";

export const SHOP_NAME = "Butty & Co";
export const SHOP_NAME_DISPLAY = "Butty & Co.";
export const SHOP_TAGLINE = "Sandwich & Juice Bar";
export const SHOP_STREET = "19 Replingham Road";
export const SHOP_AREA = "Southfields";
export const SHOP_POSTCODE = "SW18 5LT";
export const SHOP_CITY = "London";
export const SHOP_LAT = 51.444986;
export const SHOP_LNG = -0.20507;
export const SHOP_URL = "https://www.butty.london";

export const SHOP_ADDRESS_LINE = `${SHOP_STREET}, ${SHOP_AREA}, ${SHOP_POSTCODE}`;
export const SHOP_ADDRESS_SHORT = `${SHOP_STREET} · ${SHOP_AREA} · ${SHOP_POSTCODE}`;

const mapsQuery = encodeURIComponent(`${SHOP_NAME}, ${SHOP_ADDRESS_LINE}`);

export const SHOP_MAPS_SEARCH = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
export const SHOP_MAPS_DIR = `https://www.google.com/maps/dir/?api=1&destination=${mapsQuery}`;
export const SHOP_MAPS_EMBED = `https://maps.google.com/maps?q=${mapsQuery}&z=17&output=embed`;

export function localBusinessJsonLd(renovating: boolean) {
  return {
    "@context": "https://schema.org",
    "@type": "CafeOrCoffeeShop",
    name: SHOP_NAME,
    alternateName: SHOP_NAME_DISPLAY,
    description: `${SHOP_TAGLINE} in ${SHOP_AREA}, ${SHOP_CITY}.`,
    url: SHOP_URL,
    image: `${SHOP_URL}/og.jpg`,
    address: {
      "@type": "PostalAddress",
      streetAddress: SHOP_STREET,
      addressLocality: SHOP_AREA,
      addressRegion: "Greater London",
      postalCode: SHOP_POSTCODE,
      addressCountry: "GB",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: SHOP_LAT,
      longitude: SHOP_LNG,
    },
    hasMap: SHOP_MAPS_SEARCH,
    servesCuisine: "Sandwiches",
    priceRange: "£",
    ...(renovating
      ? {
          openingHoursSpecification: {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: [
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday",
            ],
            opens: "00:00",
            closes: "00:00",
          },
        }
      : {
          openingHoursSpecification: {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: [
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ],
            opens: "08:00",
            closes: "17:00",
          },
        }),
  };
}

export type MenuOfferItem = {
  section: string;
  name: string;
  desc: string;
  price: number;
  soldOut: boolean;
};

export type MenuOfferSource = {
  renovating: boolean;
  items: MenuOfferItem[];
};

function offerAvailability(item: MenuOfferItem, renovating: boolean) {
  if (item.soldOut) return "https://schema.org/OutOfStock";
  if (renovating) return "https://schema.org/PreOrder";
  return "https://schema.org/InStock";
}

function sectionsInOrder(items: MenuOfferItem[]) {
  const groups = new Map<string, MenuOfferItem[]>();
  for (const item of items) {
    const list = groups.get(item.section) ?? [];
    list.push(item);
    groups.set(item.section, list);
  }
  const known = SECTION_ORDER.filter((name) => groups.has(name));
  const extra = [...groups.keys()].filter(
    (name) => !(SECTION_ORDER as readonly string[]).includes(name),
  );
  return [...known, ...extra].map((name) => ({
    name,
    items: groups.get(name) ?? [],
  }));
}

/** Live menu as schema.org graph. Prices come from the shop menu, not a copy. */
export function menuJsonLd(menu: MenuOfferSource) {
  const business = localBusinessJsonLd(menu.renovating);
  const { "@context": _context, ...businessNode } = business;
  if (menu.items.length === 0) return business;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        ...businessNode,
        "@id": `${SHOP_URL}/#shop`,
        hasMenu: { "@id": `${SHOP_URL}/#menu` },
      },
      {
        "@type": "Menu",
        "@id": `${SHOP_URL}/#menu`,
        name: `${SHOP_NAME} menu`,
        url: `${SHOP_URL}/llms.txt`,
        inLanguage: "en-GB",
        hasMenuSection: sectionsInOrder(menu.items).map((section) => ({
          "@type": "MenuSection",
          name: section.name,
          hasMenuItem: section.items.map((item) => ({
            "@type": "MenuItem",
            name: item.name,
            description: item.desc,
            offers: {
              "@type": "Offer",
              price: item.price.toFixed(2),
              priceCurrency: "GBP",
              availability: offerAvailability(item, menu.renovating),
              url: SHOP_URL,
            },
          })),
        })),
      },
    ],
  };
}

/** Plain-text menu for assistants that do not run the page. */
export function menuForBotsText(menu: MenuOfferSource) {
  const status = menu.renovating
    ? "Opening soon."
    : "Open for collection.";
  const lines = [
    `# ${SHOP_NAME}`,
    "",
    `> ${SHOP_TAGLINE} at ${SHOP_ADDRESS_LINE}, ${SHOP_CITY}. ${status} Prices are GBP and are read from the live shop menu at ${SHOP_URL}.`,
    "",
    "## Menu",
    "",
  ];
  for (const section of sectionsInOrder(menu.items)) {
    lines.push(`### ${section.name}`, "");
    for (const item of section.items) {
      const sold = item.soldOut ? " Sold out." : "";
      const desc = item.desc.trim() ? ` ${item.desc.trim()}` : "";
      lines.push(`- ${item.name} — £${item.price.toFixed(2)}.${desc}${sold}`);
    }
    lines.push("");
  }
  lines.push(`Menu page: ${SHOP_URL}`, "");
  return lines.join("\n");
}
