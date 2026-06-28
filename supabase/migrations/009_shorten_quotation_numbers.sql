create table if not exists public.quotation_number_counters (
  quote_year integer primary key,
  last_number integer not null default 0 check (last_number >= 0),
  updated_at timestamptz not null default now()
);

alter table public.quotation_number_counters enable row level security;

with quote_families as (
  select
    base_quote_number,
    min(quote_date) as family_date,
    min(created_at) as family_created_at
  from public.quotations
  group by base_quote_number
),
numbered_families as (
  select
    base_quote_number,
    concat(
      'SFEQ-',
      to_char(family_date, 'YY'),
      '-',
      lpad(
        row_number() over (
          partition by extract(year from family_date)
          order by family_date, family_created_at, base_quote_number
        )::text,
        4,
        '0'
      )
    ) as new_base_quote_number
  from quote_families
),
updated_quotations as (
  update public.quotations as quotation
  set
    base_quote_number = numbered.new_base_quote_number,
    quote_number = case
      when quotation.revision = 0 then numbered.new_base_quote_number
      else concat(numbered.new_base_quote_number, '-R', quotation.revision)
    end,
    pdf_url = null,
    pdf_path = null
  from numbered_families as numbered
  where quotation.base_quote_number = numbered.base_quote_number
  returning quotation.id
)
delete from public.pdf_files
where quotation_id in (select id from updated_quotations);

insert into public.quotation_number_counters (quote_year, last_number)
select
  extract(year from quote_date)::integer,
  max(substring(base_quote_number from '([0-9]+)$')::integer)
from public.quotations
where revision = 0
group by extract(year from quote_date)::integer
on conflict (quote_year) do update
set
  last_number = greatest(
    public.quotation_number_counters.last_number,
    excluded.last_number
  ),
  updated_at = now();

create or replace function public.next_quotation_base_number(
  p_quote_date date default current_date
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  target_date date := coalesce(p_quote_date, current_date);
  target_year integer := extract(year from target_date)::integer;
  next_number integer;
begin
  insert into public.quotation_number_counters as counters (
    quote_year,
    last_number,
    updated_at
  )
  values (target_year, 1, now())
  on conflict (quote_year) do update
  set
    last_number = counters.last_number + 1,
    updated_at = now()
  returning last_number into next_number;

  return concat(
    'SFEQ-',
    to_char(target_date, 'YY'),
    '-',
    lpad(next_number::text, 4, '0')
  );
end;
$$;

revoke all on function public.next_quotation_base_number(date) from public;
grant execute on function public.next_quotation_base_number(date) to service_role;
