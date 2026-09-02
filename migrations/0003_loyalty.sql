-- Butty Club: per-user loyalty profiles + ledger. Orders may optionally
-- belong to a signed-in customer; kitchen tickets stay unowned either way.

alter table orders add column if not exists user_id text;
alter table orders add column if not exists points_earned int not null default 0;
alter table orders add column if not exists discount_gbp numeric(6,2) not null default 0;

create index if not exists orders_user_id_idx on orders (user_id);

create table if not exists customer_profiles (
  user_id            text primary key,
  display_name       text not null default '',
  loyalty_opted_in   boolean not null default false,
  loyalty_opted_in_at timestamptz,
  points_balance     int not null default 0,
  created_at         timestamptz not null default now()
);

create table if not exists loyalty_events (
  id         serial primary key,
  user_id    text not null,
  kind       text not null,
  points     int not null default 0,
  order_id   text,
  note       text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists loyalty_events_user_idx
  on loyalty_events (user_id, created_at desc);
