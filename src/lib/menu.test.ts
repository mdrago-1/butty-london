import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { DRINK_ADDONS, drinkGroupOf, extrasForDrink, guessDrinkGroup, subGroups } from "./menu.ts";

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "../../migrations");

type Drink = {
  id: string;
  name: string;
  subgroup?: string | null;
  extras?: { n: string; p: number }[];
};

function drink(id: string, name: string, subgroup: string | null = null): Drink {
  return { id, name, subgroup, extras: [] };
}

/** Names on the live Juices & Drinks board, including the ten added in /office. */
const LIVE_DRINKS: Drink[] = [
  drink("dr-green", "Green Giant"),
  drink("dr-bugs", "Bugs Bunny"),
  drink("dr-orange", "Orange Juice"),
  drink("dr-passion", "Passion Lava"),
  drink("dr-cycling", "Cycling Watts"),
  drink("dr-winter", "Winter Prep"),
  drink("dr-iron", "Iron Man"),
  drink("dr-shake-vanilla", "Vanilla Shake"),
  drink("dr-shake-oreo", "Oreo Shake"),
  drink("n-choc-shake", "Chocolate Shake"),
  drink("n-straw-shake", "Strawberry Shake"),
  drink("dr-muscle", "Muscle Up"),
  drink("dr-berry", "Berry Sunny"),
  drink("dr-tutti", "Tutti Fruity"),
  drink("dr-nutty", "Nutty"),
  drink("n-tropical", "Tropical"),
  drink("n-frozen", "Frozen"),
  drink("n-matcha-boost", "Matcha Boost"),
  drink("n-hulk", "Hulk"),
  drink("dr-bullet", "Bullet Proof"),
  drink("dr-caplatte", "Cappuccino"),
  drink("dr-flat", "Flat White"),
  drink("dr-cortado", "Cortado"),
  drink("dr-espresso", "Espresso"),
  drink("n-americano", "Americano"),
  drink("n-latte", "Latte"),
  drink("n-long-black", "Long Black"),
  drink("n-mocha", "Mocha"),
  drink("dr-matcha", "Matcha Latte"),
  drink("dr-choc", "Hot Chocolate"),
  drink("dr-chai", "Chai Latte"),
  drink("dr-tea", "English Tea"),
  drink("dr-earl", "Earl Grey"),
];

function namesIn(group: string): string[] {
  const found = subGroups("Juices & Drinks", LIVE_DRINKS).find((g) => g.name === group);
  return (found?.items ?? []).map((item) => item.name);
}

describe("drink headings", () => {
  it("files the live board, including office-added drinks, with no More list", () => {
    const groups = subGroups("Juices & Drinks", LIVE_DRINKS);
    assert.deepEqual(
      groups.map((group) => group.name),
      ["Juice", "Shakes", "Smoothies", "Coffee", "Not Coffee"],
    );
    assert.equal(
      groups.some((group) => group.name === "More"),
      false,
    );

    assert.deepEqual(namesIn("Shakes"), [
      "Vanilla Shake",
      "Oreo Shake",
      "Chocolate Shake",
      "Strawberry Shake",
    ]);
    assert.ok(namesIn("Smoothies").includes("Tropical"));
    assert.ok(namesIn("Smoothies").includes("Frozen"));
    assert.ok(namesIn("Smoothies").includes("Matcha Boost"));
    assert.ok(namesIn("Smoothies").includes("Hulk"));
    assert.ok(namesIn("Smoothies").includes("Berry Sunny"));
    assert.deepEqual(
      ["Americano", "Latte", "Long Black", "Mocha"].every((name) =>
        namesIn("Coffee").includes(name),
      ),
      true,
    );
    assert.equal(namesIn("Coffee").includes("Matcha Latte"), false);
    assert.ok(namesIn("Not Coffee").includes("Matcha Latte"));
    assert.ok(namesIn("Juice").includes("Green Giant"));

    const withNote = new Set(["Juice", "Smoothies"]);
    for (const group of groups) {
      if (group.name && withNote.has(group.name)) {
        assert.match(group.note ?? "", /whey protein £2\.50/);
      } else {
        assert.equal(group.note, undefined);
      }
    }
  });

  it("lets the owner override a heading, and keeps the original ids otherwise", () => {
    assert.equal(
      drinkGroupOf({ id: "dr-green", name: "Chocolate Shake", section: "Juices & Drinks" }),
      "Juice",
    );
    assert.equal(
      drinkGroupOf({
        id: "dr-green",
        name: "Green Giant",
        section: "Juices & Drinks",
        subgroup: "Coffee",
      }),
      "Coffee",
    );
    assert.equal(guessDrinkGroup("  chocolate   shake "), "Shakes");
    assert.equal(guessDrinkGroup("Mango Smoothie"), "Smoothies");
    assert.equal(guessDrinkGroup("Iced Americano"), "Coffee");
    assert.equal(guessDrinkGroup("Sunrise"), null);

    const odd = subGroups("Juices & Drinks", [
      drink("n-sunrise", "Sunrise"),
      { id: "n-sunrise-2", name: "Sunrise", subgroup: "Smoothies" },
    ]);
    assert.equal(odd.find((group) => group.name === "More")?.items.length, 1);
    assert.equal(odd.find((group) => group.name === "Smoothies")?.items.length, 1);
  });

  it("gives juices and smoothies the group add-ons, and shakes none", () => {
    const inherited = extrasForDrink({
      id: "n-tropical",
      name: "Tropical",
      section: "Juices & Drinks",
      extras: [],
    });
    assert.deepEqual(
      inherited.map((extra) => extra.n),
      DRINK_ADDONS.map((extra) => extra.n),
    );
    assert.deepEqual(
      extrasForDrink({
        id: "n-americano",
        name: "Americano",
        section: "Juices & Drinks",
        extras: [],
      }),
      [],
    );
    assert.deepEqual(
      extrasForDrink({
        id: "dr-shake-vanilla",
        name: "Vanilla Shake",
        section: "Juices & Drinks",
        extras: DRINK_ADDONS,
      }),
      [],
    );
    assert.deepEqual(
      extrasForDrink({
        id: "n-strawberry",
        name: "Strawberry Shake",
        section: "Juices & Drinks",
        extras: DRINK_ADDONS,
      }),
      [],
    );
    assert.deepEqual(
      extrasForDrink({
        id: "dr-shake-oreo",
        name: "Oreo Shake",
        section: "Juices & Drinks",
        subgroup: "Shakes",
        extras: [{ n: "Oat milk", p: 0.5 }],
      }),
      [],
    );
    const custom = [{ n: "Oat milk", p: 0.5 }];
    assert.deepEqual(
      extrasForDrink({
        id: "n-hulk",
        name: "Hulk",
        section: "Juices & Drinks",
        extras: custom,
      }),
      custom,
    );
    assert.deepEqual(
      extrasForDrink({
        id: "bf-bacon",
        name: "Bacon Butty",
        section: "Breakfast Butties",
        extras: [],
      }),
      [],
    );
  });

  it("does not split sandwich sections", () => {
    const items = [drink("bf-bacon", "Bacon Butty")];
    assert.deepEqual(subGroups("Breakfast Butties", items), [{ name: null, items }]);
  });
});

function migrationFiles(): string[] {
  return readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
}

async function applyMigrations(pg: PGlite, names: string[]) {
  for (const name of names) {
    await pg.exec(readFileSync(join(migrationsDir, name), "utf8"));
  }
}

type MenuSnapshot = {
  id: string;
  name: string;
  description: string;
  price: string;
  section: string;
};

function num(value: unknown): number {
  return typeof value === "number" ? value : parseFloat(String(value));
}

function extrasOf(value: unknown): { n: string; p: number }[] {
  if (typeof value === "string") return JSON.parse(value) as { n: string; p: number }[];
  return Array.isArray(value) ? (value as { n: string; p: number }[]) : [];
}

describe("drink subgroup migration", () => {
  it("keeps existing rows and files office-added drinks", { timeout: 60_000 }, async () => {
    const sql = readFileSync(join(migrationsDir, "0019_drink_subgroups.sql"), "utf8");
    const clearShakes = readFileSync(join(migrationsDir, "0020_shakes_no_addons.sql"), "utf8");
    assert.doesNotMatch(sql, /\bset price\b/i);
    assert.doesNotMatch(sql, /\bset name\b/i);
    assert.doesNotMatch(sql, /\bset description\b/i);
    assert.doesNotMatch(sql, /\bdelete from menu_items\b/i);
    assert.match(sql, /subgroup in \('Juice', 'Smoothies'\)/);
    assert.doesNotMatch(sql, /'Juice', 'Shakes', 'Smoothies'/);
    assert.match(clearShakes, /set extras = '\[\]'::jsonb/);
    assert.doesNotMatch(clearShakes, /\bset price\b/i);

    const pg = new PGlite();
    await pg.waitReady;
    const files = migrationFiles();
    await applyMigrations(
      pg,
      files.filter((name) => name < "0019_drink_subgroups.sql"),
    );

    const before = (
      await pg.query<MenuSnapshot>(
        "select id, section, name, description, price::text as price from menu_items order by id",
      )
    ).rows;

    await pg.exec(`
      insert into menu_items (
        id, section, name, description, price, avail_from, avail_to,
        sold_out, veg, allergens, removable, extras, sort_order
      ) values
        ('n-americano', 'Juices & Drinks', 'Americano', '', 3.00, 8, 17, false, false, '[]', '[]', '[]', 77),
        ('n-latte', 'Juices & Drinks', 'Latte', 'Regular 8oz £4.25, Large 12oz £4.50', 4.25, 8, 17, false, false, '[]', '[]', '[]', 77),
        ('n-long-black', 'Juices & Drinks', 'Long Black', '', 3.60, 8, 17, false, false, '[]', '[]', '[]', 77),
        ('n-mocha', 'Juices & Drinks', 'Mocha', '', 4.80, 8, 17, false, false, '[]', '[]', '[]', 77),
        ('n-tropical', 'Juices & Drinks', 'Tropical', 'Pineapple, mango, passionfruit, apple', 6.00, 8, 17, false, false, '[]', '[]', '[]', 77),
        ('n-frozen', 'Juices & Drinks', 'Frozen', 'Banana, pineapple, lime, blue spirulina, coconut milk', 8.00, 8, 17, false, false, '[]', '[]', '[]', 77),
        ('n-matcha-boost', 'Juices & Drinks', 'Matcha Boost', 'Banana, spinach, almond butter, matcha, vanilla protein powder', 8.00, 8, 17, false, false, '[]', '[]', '[]', 77),
        ('n-hulk', 'Juices & Drinks', 'Hulk', 'Banana, pineapple, kale, ginger, lime, apple', 6.00, 8, 17, false, false, '[]', '[]', '[]', 77),
        ('n-strawberry', 'Juices & Drinks', 'Strawberry Shake', 'Milk, strawberry ice cream', 5.00, 8, 17, false, false, '[]', '[]', '[]', 77),
        ('n-chocolate', 'Juices & Drinks', 'Chocolate Shake', 'Milk, chocolate ice cream', 6.00, 8, 17, false, false, '[]', '[]', '[]', 77)
    `);

    await pg.exec(sql);
    await pg.exec(sql);
    await pg.exec(clearShakes);

    const after = (
      await pg.query<
        MenuSnapshot & { subgroup: string | null; extras: unknown; sort_order: number }
      >(
        `select id, section, name, description, price::text as price, subgroup, extras, sort_order
         from menu_items order by id`,
      )
    ).rows;

    const afterById = new Map(after.map((row) => [row.id, row]));
    for (const row of before) {
      const next = afterById.get(row.id);
      assert.ok(next, `missing ${row.id}`);
      assert.equal(next.name, row.name);
      assert.equal(next.description, row.description);
      assert.equal(num(next.price), num(row.price));
      assert.equal(next.section, row.section);
    }

    const expectGroup: Record<string, string> = {
      "n-americano": "Coffee",
      "n-latte": "Coffee",
      "n-long-black": "Coffee",
      "n-mocha": "Coffee",
      "n-tropical": "Smoothies",
      "n-frozen": "Smoothies",
      "n-matcha-boost": "Smoothies",
      "n-hulk": "Smoothies",
      "n-strawberry": "Shakes",
      "n-chocolate": "Shakes",
    };
    for (const [id, group] of Object.entries(expectGroup)) {
      const row = afterById.get(id);
      assert.ok(row, id);
      assert.equal(row.subgroup, group);
      assert.equal(num(row.sort_order), 77);
      const extras = extrasOf(row.extras);
      if (group === "Coffee" || group === "Shakes") assert.deepEqual(extras, []);
      else {
        assert.deepEqual(
          extras.map((extra) => extra.n),
          DRINK_ADDONS.map((extra) => extra.n),
        );
      }
    }

    for (const id of ["dr-shake-vanilla", "dr-shake-oreo"]) {
      assert.deepEqual(extrasOf(afterById.get(id)?.extras), []);
    }
    assert.deepEqual(
      extrasOf(afterById.get("dr-green")?.extras).map((extra) => extra.n),
      DRINK_ADDONS.map((extra) => extra.n),
    );

    const names = after.map((row) => `${row.section}:${row.name}`);
    for (const name of Object.keys(expectGroup).map((id) => afterById.get(id)?.name)) {
      assert.equal(names.filter((entry) => entry === `Juices & Drinks:${name}`).length, 1);
    }

    assert.equal(afterById.get("dr-green")?.subgroup, "Juice");
    assert.equal(afterById.get("dr-flat")?.subgroup, "Coffee");
    assert.equal(afterById.get("bf-bacon")?.subgroup, null);
    await pg.close();
  });
});
