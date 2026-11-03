-- Student sheet music uploads (MusicXML / compressed MXL) from the Sheet Music Practice page.
-- The file itself lives in the private 'student-sheet-music' bucket; this table holds the
-- metadata and the storage path. Each user can only see and manage their own uploads.

create table if not exists public.student_sheet_music (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_type text not null check (file_type in ('musicxml', 'mxl')),
  file_size_bytes bigint not null check (file_size_bytes > 0),
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists student_sheet_music_user_id_idx
  on public.student_sheet_music (user_id, created_at desc);

alter table public.student_sheet_music enable row level security;

drop policy if exists "student_sheet_music_select_own" on public.student_sheet_music;
create policy "student_sheet_music_select_own" on public.student_sheet_music
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "student_sheet_music_insert_own" on public.student_sheet_music;
create policy "student_sheet_music_insert_own" on public.student_sheet_music
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "student_sheet_music_delete_own" on public.student_sheet_music;
create policy "student_sheet_music_delete_own" on public.student_sheet_music
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Private bucket: files are stored under "<user_id>/<file>" and only that user can access them.
insert into storage.buckets (id, name, public, file_size_limit)
values ('student-sheet-music', 'student-sheet-music', false, 20971520)
on conflict (id) do nothing;

drop policy if exists "student_sheet_music_files_select_own" on storage.objects;
create policy "student_sheet_music_files_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'student-sheet-music' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "student_sheet_music_files_insert_own" on storage.objects;
create policy "student_sheet_music_files_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'student-sheet-music' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "student_sheet_music_files_delete_own" on storage.objects;
create policy "student_sheet_music_files_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'student-sheet-music' and (storage.foldername(name))[1] = (select auth.uid())::text);
