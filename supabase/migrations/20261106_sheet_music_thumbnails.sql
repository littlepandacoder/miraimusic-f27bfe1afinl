-- Thumbnail images for the sheet music library (shown above each song's title).
-- Requires 20261105_sheet_music_library.sql to be applied first.
-- Thumbnails are in a private bucket; signed-in users read them, only admins add or remove them.

alter table public.sheet_music_library
  add column if not exists thumbnail_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sheet-music-thumbs', 'sheet-music-thumbs', false, 5242880,
        array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "sheet_music_thumbs_select" on storage.objects;
create policy "sheet_music_thumbs_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'sheet-music-thumbs');

drop policy if exists "sheet_music_thumbs_insert_admin" on storage.objects;
create policy "sheet_music_thumbs_insert_admin" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'sheet-music-thumbs' and exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = 'admin'
  ));

drop policy if exists "sheet_music_thumbs_delete_admin" on storage.objects;
create policy "sheet_music_thumbs_delete_admin" on storage.objects
  for delete to authenticated
  using (bucket_id = 'sheet-music-thumbs' and exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = 'admin'
  ));
