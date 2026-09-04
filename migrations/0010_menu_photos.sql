-- Optional photo path for customer menu cards. Missing files use the placeholder.

alter table menu_items
  add column if not exists photo text;

update menu_items
set photo = '/menu/' || id || '.jpg'
where photo is null or photo = '';
