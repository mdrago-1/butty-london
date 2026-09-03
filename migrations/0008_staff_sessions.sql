-- Shared till: job roles, who took the ticket, voids.

alter table staff_employees
  add column if not exists job_role text not null default 'cashier';

alter table orders
  add column if not exists taken_by text;

alter table orders
  add column if not exists taken_by_name text;

alter table orders
  add column if not exists voided boolean not null default false;

alter table orders
  add column if not exists voided_at timestamptz;

alter table orders
  add column if not exists voided_by text;

create index if not exists orders_taken_by_idx
  on orders (taken_by, created_at desc);
