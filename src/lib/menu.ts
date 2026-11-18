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

/**
 * Protein add-ons printed on the juice, shake, and smoothie boards.
 * Stored on each of those items; an empty extras list means "use these".
 */
export const DRINK_ADDONS: { n: string; p: number }[] = [
  { n: "Organic Protein Company whey protein", p: 2.5 },
  { n: "Cacao & Maca whey", p: 2.5 },
  { n: "Collagen (bovine)", p: 2 },
  { n: "Creatine", p: 2 },
];

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

const DRINK_GROUP_BY_ID = new Map<string, string>();
for (const group of DRINK_GROUPS) {
  for (const id of group.ids) DRINK_GROUP_BY_ID.set(id, group.name);
}

const DRINK_ADDON_GROUPS = new Set(
  DRINK_GROUPS.filter((group) => group.note).map((group) => group.name),
);

/**
 * Smoothies the shop already sells whose names do not contain "smoothie".
 * New drinks should set `menu_items.subgroup` in /office; this only keeps
 * rows that were added before that field existed out of the More list.
 */
const SMOOTHIE_NAMES = new Set(["tropical", "frozen", "hulk", "matcha boost"]);

export function canonicalDrinkGroup(value: string | null | undefined): string | null {
  if (!value) return null;
  const key = value.trim().toLowerCase();
  return DRINK_GROUPS.find((group) => group.name.toLowerCase() === key)?.name ?? null;
}

export function drinkGroupHasAddons(group: string | null | undefined): boolean {
  const name = canonicalDrinkGroup(group);
  return name != null && DRINK_ADDON_GROUPS.has(name);
}

function normDrinkName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Best heading for a drink name when nobody has set a subgroup. */
export function guessDrinkGroup(name: string): string | null {
  const n = normDrinkName(name);
  if (!n) return null;
  if (/\bshakes?\b/.test(n)) return "Shakes";
  if (/\bsmoothies?\b/.test(n) || SMOOTHIE_NAMES.has(n)) return "Smoothies";
  if (/\b(matcha latte|hot chocolate|chai|english tea|earl grey|tea)\b/.test(n)) {
    return "Not Coffee";
  }
  if (
    /\b(americano|long black|mocha|cappuccino|flat white|cortado|espresso|bullet|latte|coffee)\b/.test(
      n,
    )
  ) {
    return "Coffee";
  }
  if (/\bjuices?\b/.test(n)) return "Juice";
  return null;
}

type DrinkGroupItem = {
  id?: string;
  name?: string;
  section?: string | null;
  subgroup?: string | null;
};

/**
 * Heading for one drink.
 * Owner's subgroup wins, then the original board ids, then the name.
 */
export function drinkGroupOf(item: DrinkGroupItem): string | null {
  if (item.section != null && item.section !== "Juices & Drinks") return null;
  const chosen = canonicalDrinkGroup(item.subgroup);
  if (chosen) return chosen;
  if (item.id) {
    const byId = DRINK_GROUP_BY_ID.get(item.id);
    if (byId) return byId;
  }
  return guessDrinkGroup(item.name ?? "");
}

/** Subgroup persisted for a menu row. Blank on anything that is not a drink. */
export function drinkSubgroupToStore(item: DrinkGroupItem): string | null {
  if (item.section !== "Juices & Drinks") return null;
  return drinkGroupOf(item);
}

export function formatDrinkAddons(extras: { n: string; p: number }[] = DRINK_ADDONS): string {
  return extras.map((extra) => `${extra.n} £${extra.p.toFixed(2)}`).join("\n");
}

/**
 * Extras shown and charged for a drink.
 * A juice, shake, or smoothie with none of its own uses the group add-ons.
 */
export function extrasForDrink(
  item: DrinkGroupItem & {
    extras?: { n: string; p: number }[] | null;
  },
): { n: string; p: number }[] {
  const stored = item.extras ?? [];
  if (stored.length > 0) return stored;
  if (item.section != null && item.section !== "Juices & Drinks") return [];
  if (!drinkGroupHasAddons(drinkGroupOf(item))) return [];
  return DRINK_ADDONS.map((extra) => ({ ...extra }));
}

/** Split a section's items into subheaded groups (unknown items fall into a trailing group). */
export function subGroups<T extends DrinkGroupItem & { id: string }>(
  section: string,
  items: T[],
): { name: string | null; note?: string; items: T[] }[] {
  if (section !== "Juices & Drinks") return [{ name: null, items }];
  const buckets = new Map<string, T[]>(DRINK_GROUPS.map((group) => [group.name, []]));
  const rest: T[] = [];
  for (const item of items) {
    const name = drinkGroupOf({ ...item, section });
    const bucket = name ? buckets.get(name) : undefined;
    if (bucket) bucket.push(item);
    else rest.push(item);
  }
  const out: { name: string | null; note?: string; items: T[] }[] = [];
  for (const group of DRINK_GROUPS) {
    const grouped = buckets.get(group.name) ?? [];
    if (grouped.length) out.push({ name: group.name, note: group.note, items: grouped });
  }
  if (rest.length) out.push({ name: out.length ? "More" : null, items: rest });
  return out;
}
