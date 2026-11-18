-- Shakes have no protein add-ons. 0019 used to copy the juice add-ons onto a
-- shake with an empty extras list, and the original Vanilla and Oreo rows
-- already stored those add-ons. Clear every shake. Juices and smoothies are
-- left alone. Prices, names, and descriptions are not changed.

update menu_items
set extras = '[]'::jsonb
where section = 'Juices & Drinks'
  and (
    subgroup = 'Shakes'
    or lower(regexp_replace(btrim(name), '\s+', ' ', 'g')) like '%shake%'
  );
