-- Sandwich stamp card (buy 9, 10th free) + staff password hashes.

alter table customer_profiles
  add column if not exists stamps_balance int not null default 0;

update customer_profiles
set stamps_balance = least(9, floor(points_balance / 50.0)::int)
where stamps_balance = 0 and points_balance > 0;

alter table shop_settings
  add column if not exists kitchen_password_hash text not null default '',
  add column if not exists manager_password_hash text not null default '';
