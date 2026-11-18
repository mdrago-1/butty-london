-- Drink headings (Juice, Shakes, Smoothies, Coffee, Not Coffee) live on the row.
-- /office sets menu_items.subgroup. The column is nullable, so older rows and
-- older app versions keep working: nothing here changes a price, name, or
-- description, and nothing is deleted.
--
-- Rows the owner already added (Americano, Latte, Long Black, Mocha, Tropical,
-- Frozen, Matcha Boost, Hulk, Strawberry Shake, Chocolate Shake) are matched by
-- name. They are inserted only when that drink is not already on the menu, so a
-- database that already has them is left as the owner saved it.
-- Shakes are not given protein add-ons. Any extras already stored on a shake
-- (including Vanilla and Oreo) are cleared. Juices and smoothies keep theirs.

alter table menu_items
  add column if not exists subgroup text;

update menu_items set subgroup = 'Juice'
where subgroup is null and id in (
  'dr-green', 'dr-bugs', 'dr-orange', 'dr-passion',
  'dr-cycling', 'dr-winter', 'dr-iron', 'dr-cacao'
);

update menu_items set subgroup = 'Shakes'
where subgroup is null and id in ('dr-shake-vanilla', 'dr-shake-oreo');

update menu_items set subgroup = 'Smoothies'
where subgroup is null and id in ('dr-muscle', 'dr-berry', 'dr-tutti', 'dr-nutty');

update menu_items set subgroup = 'Coffee'
where subgroup is null and id in (
  'dr-bullet', 'dr-caplatte', 'dr-flat', 'dr-cortado', 'dr-espresso'
);

update menu_items set subgroup = 'Not Coffee'
where subgroup is null and id in (
  'dr-matcha', 'dr-choc', 'dr-chai', 'dr-tea', 'dr-earl'
);

-- Office-added drinks have generated ids, so the id lists above miss them.
update menu_items set subgroup = 'Juice'
where section = 'Juices & Drinks'
  and subgroup is null
  and lower(regexp_replace(btrim(name), '\s+', ' ', 'g')) in (
    'green giant', 'bugs bunny', 'orange juice', 'passion lava',
    'cycling watts', 'winter prep', 'iron man', 'go-cacao-go'
  );

update menu_items set subgroup = 'Shakes'
where section = 'Juices & Drinks'
  and subgroup is null
  and lower(regexp_replace(btrim(name), '\s+', ' ', 'g')) in (
    'vanilla shake', 'oreo shake', 'strawberry shake', 'chocolate shake'
  );

update menu_items set subgroup = 'Smoothies'
where section = 'Juices & Drinks'
  and subgroup is null
  and lower(regexp_replace(btrim(name), '\s+', ' ', 'g')) in (
    'muscle up', 'berry sunny', 'tutti fruity', 'nutty',
    'tropical', 'frozen', 'matcha boost', 'hulk'
  );

update menu_items set subgroup = 'Coffee'
where section = 'Juices & Drinks'
  and subgroup is null
  and lower(regexp_replace(btrim(name), '\s+', ' ', 'g')) in (
    'bullet proof', 'cappuccino', 'cappuccino / latte', 'flat white',
    'cortado', 'espresso', 'americano', 'latte', 'long black', 'mocha'
  );

update menu_items set subgroup = 'Not Coffee'
where section = 'Juices & Drinks'
  and subgroup is null
  and lower(regexp_replace(btrim(name), '\s+', ' ', 'g')) in (
    'matcha latte', 'hot chocolate', 'chai latte', 'english tea', 'earl grey'
  );

insert into menu_items (
  id, section, name, description, price, avail_from, avail_to,
  sold_out, veg, allergens, removable, extras, sort_order, photo, subgroup
)
select
  v.id,
  'Juices & Drinks',
  v.name,
  v.description,
  v.price,
  8,
  17,
  false,
  false,
  '[]'::jsonb,
  '[]'::jsonb,
  v.extras,
  100,
  null,
  v.subgroup
from (
  values
    ('dr-added-americano', 'Americano', '', 3.00::numeric, '[]'::jsonb, 'Coffee'),
    (
      'dr-added-latte',
      'Latte',
      'Regular 8oz £4.25, Large 12oz £4.50',
      4.25::numeric,
      '[]'::jsonb,
      'Coffee'
    ),
    ('dr-added-long-black', 'Long Black', '', 3.60::numeric, '[]'::jsonb, 'Coffee'),
    ('dr-added-mocha', 'Mocha', '', 4.80::numeric, '[]'::jsonb, 'Coffee'),
    (
      'dr-added-tropical',
      'Tropical',
      'Pineapple, mango, passionfruit, apple',
      6.00::numeric,
      '[{"n": "Organic Protein Company whey protein", "p": 2.5}, {"n": "Cacao & Maca whey", "p": 2.5}, {"n": "Collagen (bovine)", "p": 2}, {"n": "Creatine", "p": 2}]'::jsonb,
      'Smoothies'
    ),
    (
      'dr-added-frozen',
      'Frozen',
      'Banana, pineapple, lime, blue spirulina, coconut milk',
      8.00::numeric,
      '[{"n": "Organic Protein Company whey protein", "p": 2.5}, {"n": "Cacao & Maca whey", "p": 2.5}, {"n": "Collagen (bovine)", "p": 2}, {"n": "Creatine", "p": 2}]'::jsonb,
      'Smoothies'
    ),
    (
      'dr-added-matcha-boost',
      'Matcha Boost',
      'Banana, spinach, almond butter, matcha, vanilla protein powder',
      8.00::numeric,
      '[{"n": "Organic Protein Company whey protein", "p": 2.5}, {"n": "Cacao & Maca whey", "p": 2.5}, {"n": "Collagen (bovine)", "p": 2}, {"n": "Creatine", "p": 2}]'::jsonb,
      'Smoothies'
    ),
    (
      'dr-added-hulk',
      'Hulk',
      'Banana, pineapple, kale, ginger, lime, apple',
      6.00::numeric,
      '[{"n": "Organic Protein Company whey protein", "p": 2.5}, {"n": "Cacao & Maca whey", "p": 2.5}, {"n": "Collagen (bovine)", "p": 2}, {"n": "Creatine", "p": 2}]'::jsonb,
      'Smoothies'
    ),
    (
      'dr-added-strawberry-shake',
      'Strawberry Shake',
      'Milk, strawberry ice cream',
      5.00::numeric,
      '[]'::jsonb,
      'Shakes'
    ),
    (
      'dr-added-chocolate-shake',
      'Chocolate Shake',
      'Milk, chocolate ice cream',
      6.00::numeric,
      '[]'::jsonb,
      'Shakes'
    )
) as v(id, name, description, price, extras, subgroup)
where not exists (
  select 1 from menu_items m
  where m.section = 'Juices & Drinks'
    and lower(regexp_replace(btrim(m.name), '\s+', ' ', 'g')) = lower(v.name)
)
and not exists (
  select 1 from menu_items m where m.id = v.id
);

-- Same add-ons the other juices and smoothies already carry,
-- and only where a drink in those groups has none of its own.
-- Shakes are not included: they have no protein add-ons.
update menu_items
set extras = '[{"n": "Organic Protein Company whey protein", "p": 2.5}, {"n": "Cacao & Maca whey", "p": 2.5}, {"n": "Collagen (bovine)", "p": 2}, {"n": "Creatine", "p": 2}]'::jsonb
where section = 'Juices & Drinks'
  and subgroup in ('Juice', 'Smoothies')
  and jsonb_typeof(extras) = 'array'
  and jsonb_array_length(extras) = 0;

-- Vanilla, Oreo, and any other shake already store those add-ons from the
-- old board. Clear them. Prices, names, and descriptions stay as they are.
update menu_items
set extras = '[]'::jsonb
where section = 'Juices & Drinks'
  and (
    subgroup = 'Shakes'
    or lower(regexp_replace(btrim(name), '\s+', ' ', 'g')) like '%shake%'
  );
