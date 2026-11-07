-- Breakfast board: remove the Pesto Butty from breakfast and add the Breakfast Bagel.
-- Lunch items that mention pesto (Big Tony) stay as they are.
-- Price is £7.00, the amount the shop till charges for the Breakfast Bagel.
-- Hours, allergens, removables, and extras match the other current breakfast butties.
-- Salmon Butty photos (breakfast and lunch) point at the new Scottie shot. Nothing else on those rows changes.

delete from menu_items
where section = 'Breakfast Butties'
  and (id = 'bf-pesto' or name = 'Pesto Butty');

insert into menu_items (
  id, section, name, description, price, avail_from, avail_to,
  sold_out, veg, allergens, removable, extras, sort_order, photo
) values (
  'bf-bagel',
  'Breakfast Butties',
  'Breakfast Bagel',
  'Bacon and egg on a bagel, served in the Butty tray',
  7.00,
  7.5,
  11.5,
  false,
  false,
  '[]',
  '[]',
  '[]',
  50,
  '/menu/breakfast-bagel.jpg'
)
on conflict (id) do update set
  section = excluded.section,
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  avail_from = excluded.avail_from,
  avail_to = excluded.avail_to,
  sold_out = excluded.sold_out,
  veg = excluded.veg,
  allergens = excluded.allergens,
  removable = excluded.removable,
  extras = excluded.extras,
  sort_order = excluded.sort_order,
  photo = excluded.photo;

update menu_items
set photo = '/menu/salmon-butty.jpg'
where id in ('bf-salmon', 'lu-salmon')
   or (
     name = 'Salmon Butty'
     and section in ('Breakfast Butties', 'Lunch Specials')
   );
