alter table public.team_members
add column if not exists profile_photo_url text,
add column if not exists profile_photo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'member-photos',
  'member-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public read member photos" on storage.objects;
create policy "public read member photos"
on storage.objects for select to public
using (bucket_id = 'member-photos');
