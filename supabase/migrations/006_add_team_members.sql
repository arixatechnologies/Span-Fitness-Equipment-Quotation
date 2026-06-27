create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  member_name text not null,
  phone_number text not null,
  email text not null,
  password_hash text not null,
  role text not null check (role in ('Admin', 'Manager', 'Sales Executive')),
  branch_location text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists team_members_email_lower_idx
on public.team_members (lower(email));

drop trigger if exists team_members_set_updated_at on public.team_members;
create trigger team_members_set_updated_at
before update on public.team_members
for each row execute function public.set_updated_at();

alter table public.team_members enable row level security;

-- Team members are managed only through server actions using the service-role key.
