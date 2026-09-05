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

export function menuPhotoUrl(
  item?: { id?: string; photo?: string | null } | null,
): string {
  const custom = item?.photo?.trim();
  if (custom) return custom;
  if (item?.id) return `/menu/${item.id}.jpg`;
  return MENU_PLACEHOLDER;
}

export const SECTION_NOTES: Record<string, string> = {
  "Breakfast Butties": "Served 8am – 11am",
  "All-Day Sandwiches": "Served 8am – close",
  "Lunch Specials": "Hot, made fresh 11am – 2pm",
  "Juices & Drinks": "Pressed fresh, all day",
};
