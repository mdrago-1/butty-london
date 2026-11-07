-- 0017 was already applied to the live database from the preview deploy, at £5.00.
-- Migrations run once, so that insert does not run again. The till price is £7.00.

update menu_items
set price = 7.00
where id = 'bf-bagel'
  and section = 'Breakfast Butties';
