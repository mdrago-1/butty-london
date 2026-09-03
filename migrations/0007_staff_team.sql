-- Personal till codes + shift hours.

create table if not exists staff_employees (
  id          text primary key,
  name        text not null,
  pin_hash    text not null,
  pin_key     text not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create unique index if not exists staff_employees_pin_key_uidx
  on staff_employees (pin_key)
  where active = true;

create table if not exists staff_shifts (
  id           text primary key,
  employee_id  text not null references staff_employees(id),
  clock_in     timestamptz not null default now(),
  clock_out    timestamptz
);

create index if not exists staff_shifts_employee_idx
  on staff_shifts (employee_id, clock_in desc);

create unique index if not exists staff_shifts_one_open
  on staff_shifts (employee_id)
  where clock_out is null;
