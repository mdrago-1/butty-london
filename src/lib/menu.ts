export const CLOSE = 17;
export const ALLERGENS = ["Gluten", "Dairy", "Egg", "Fish", "Nuts", "Soya"];

export const SECTION_ORDER = [
  "Breakfast Butties",
  "All-Day Sandwiches",
  "Lunch Specials",
  "Juices & Drinks",
] as const;

export const SANDWICH_SECTIONS = new Set<string>([
  "Breakfast Butties",
  "All-Day Sandwiches",
  "Lunch Specials",
]);

export function isSandwichSection(section: string): boolean {
  return SANDWICH_SECTIONS.has(section);
}

export const SECTION_SHORT: Record<string, string> = {
  "Breakfast Butties": "Breakfast",
  "All-Day Sandwiches": "Sandwiches",
  "Lunch Specials": "Lunch",
  "Juices & Drinks": "Drinks",
};

export function sectionAnchor(name: string) {
  return `menu-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export const MENU_PLACEHOLDER = "/menu/placeholder.jpg";

export function menuPhotoUrl(item?: { id?: string; photo?: string | null } | null): string {
  const custom = item?.photo?.trim();
  if (custom) return custom;
  if (item?.id) return `/menu/${item.id}.jpg`;
  return MENU_PLACEHOLDER;
}

export const SECTION_NOTES: Record<string, string> = {
  "Breakfast Butties": "Served 7:30am – 11:30am",
  "All-Day Sandwiches": "Served 8am – close",
  "Lunch Specials": "Hot, made fresh 11:30am – 4pm",
  "Juices & Drinks": "Pressed fresh, all day",
};

/** Subheadings within Juices & Drinks, in board order. Customer site only. */
const ADDONS_NOTE =
  "Add-ons: whey protein £2.50 · cacao & maca whey £2.50 · collagen £2 · creatine £2";
export const DRINK_GROUPS: { name: string; note?: string; ids: string[] }[] = [
  {
    name: "Juice",
    note: ADDONS_NOTE,
    ids: [
      "dr-green",
      "dr-bugs",
      "dr-orange",
      "dr-passion",
      "dr-cycling",
      "dr-winter",
      "dr-iron",
      "dr-cacao",
    ],
  },
  { name: "Shakes", note: ADDONS_NOTE, ids: ["dr-shake-vanilla", "dr-shake-oreo"] },
  { name: "Smoothies", note: ADDONS_NOTE, ids: ["dr-muscle", "dr-berry", "dr-tutti", "dr-nutty"] },
  { name: "Coffee", ids: ["dr-bullet", "dr-caplatte", "dr-flat", "dr-cortado", "dr-espresso"] },
  { name: "Not Coffee", ids: ["dr-matcha", "dr-choc", "dr-chai", "dr-tea", "dr-earl"] },
];

/** Split a section's items into subheaded groups (unknown items fall into a trailing group). */
export function subGroups<T extends { id: string }>(
  section: string,
  items: T[],
): { name: string | null; note?: string; items: T[] }[] {
  if (section !== "Juices & Drinks") return [{ name: null, items }];
  const used = new Set<string>();
  const out: { name: string | null; note?: string; items: T[] }[] = [];
  for (const g of DRINK_GROUPS) {
    const gi = items.filter((it) => g.ids.includes(it.id));
    gi.forEach((it) => used.add(it.id));
    if (gi.length) out.push({ name: g.name, note: g.note, items: gi });
  }
  const rest = items.filter((it) => !used.has(it.id));
  if (rest.length) out.push({ name: out.length ? "More" : null, items: rest });
  return out;
}
