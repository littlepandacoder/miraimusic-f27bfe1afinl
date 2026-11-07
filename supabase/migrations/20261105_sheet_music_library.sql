-- Shared sheet music library: uploaded by admins, visible to every signed-in user.
-- The file lives in the private 'sheet-music-library' bucket; this table holds the metadata.

create table if not exists public.sheet_music_library (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  composer text,
  file_name text not null,
  file_type text not null check (file_type in ('musicxml', 'mxl')),
  file_size_bytes bigint not null check (file_size_bytes > 0),
  storage_path text not null unique,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists sheet_music_library_created_at_idx
  on public.sheet_music_library (created_at desc);
create index if not exists sheet_music_library_uploaded_by_idx
  on public.sheet_music_library (uploaded_by);

alter table public.sheet_music_library enable row level security;

drop policy if exists "sheet_music_library_select_signed_in" on public.sheet_music_library;
create policy "sheet_music_library_select_signed_in" on public.sheet_music_library
  for select to authenticated
  using (true);

drop policy if exists "sheet_music_library_insert_admin" on public.sheet_music_library;
create policy "sheet_music_library_insert_admin" on public.sheet_music_library
  for insert to authenticated
  with check (exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = 'admin'
  ));

drop policy if exists "sheet_music_library_delete_admin" on public.sheet_music_library;
create policy "sheet_music_library_delete_admin" on public.sheet_music_library
  for delete to authenticated
  using (exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = 'admin'
  ));

insert into storage.buckets (id, name, public, file_size_limit)
values ('sheet-music-library', 'sheet-music-library', false, 20971520)
on conflict (id) do nothing;

drop policy if exists "sheet_music_library_files_select" on storage.objects;
create policy "sheet_music_library_files_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'sheet-music-library');

drop policy if exists "sheet_music_library_files_insert_admin" on storage.objects;
create policy "sheet_music_library_files_insert_admin" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'sheet-music-library' and exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = 'admin'
  ));

drop policy if exists "sheet_music_library_files_delete_admin" on storage.objects;
create policy "sheet_music_library_files_delete_admin" on storage.objects
  for delete to authenticated
  using (bucket_id = 'sheet-music-library' and exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = 'admin'
  ));
