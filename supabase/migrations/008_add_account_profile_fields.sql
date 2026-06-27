alter table public.profiles
add column if not exists email text,
add column if not exists phone_number text,
add column if not exists branch_location text,
add column if not exists profile_photo_url text,
add column if not exists profile_photo_path text;

create unique index if not exists profiles_email_lower_idx
on public.profiles (lower(email))
where email is not null;
