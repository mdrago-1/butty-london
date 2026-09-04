-- Unique staff IDs. Names may repeat. PIN uniqueness stays on active rows.

alter table staff_employees
  add column if not exists staff_code text;

update staff_employees e
set staff_code = lpad(n.n::text, 2, '0')
from (
  select id, row_number() over (order by created_at, id) as n
  from staff_employees
  where staff_code is null or staff_code = ''
) n
where e.id = n.id;

alter table staff_employees
  alter column staff_code set not null;

create unique index if not exists staff_employees_staff_code_uidx
  on staff_employees (staff_code);
