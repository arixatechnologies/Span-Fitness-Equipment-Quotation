alter table public.team_members
add column if not exists max_discount_percent numeric(5, 2);

update public.team_members
set max_discount_percent = 48
where max_discount_percent is null;

alter table public.team_members
alter column max_discount_percent set default 48,
alter column max_discount_percent set not null;

alter table public.team_members
drop constraint if exists team_members_max_discount_percent_check;

alter table public.team_members
add constraint team_members_max_discount_percent_check
check (max_discount_percent >= 0 and max_discount_percent <= 100);
