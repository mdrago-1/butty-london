-- Counter till: phone on club cards, and where an order was taken.

alter table customer_profiles
  add column if not exists phone text not null default '';

create unique index if not exists customer_profiles_phone_uidx
  on customer_profiles (phone)
  where phone <> '';

alter table orders
  add column if not exists source text not null default 'app';
