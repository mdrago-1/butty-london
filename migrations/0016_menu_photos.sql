-- Mathew's new menu photos (Oct 2026). Only the photo column of these items changes.
-- Names, prices, descriptions, hours unchanged.

update menu_items set photo = '/menu/lupo-butty.jpg' where id in ('bf-lupo', 'lu-lupo');
update menu_items set photo = '/menu/bugs-bunny.jpg' where id in ('dr-bugs');
update menu_items set photo = '/menu/green-giant.jpg' where id in ('dr-green');
update menu_items set photo = '/menu/passion-lava.jpg' where id in ('dr-passion');
update menu_items set photo = '/menu/double-butty.jpg' where id in ('bf-double');
update menu_items set photo = '/menu/flat-white.jpg' where id in ('dr-flat');
update menu_items set photo = '/menu/latte.jpg' where id in ('dr-caplatte');
update menu_items set photo = '/menu/bacon-butty.jpg' where id in ('bf-bacon');
