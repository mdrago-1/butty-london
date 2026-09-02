-- Shop closed for renovations at 19 Replingham Road.
-- Toggle from back office Shop tab when the shutters go up.

alter table shop_settings
  add column if not exists renovating boolean not null default true;

update shop_settings
set renovating = true, online_orders = false, updated_at = now()
where id = 1;
