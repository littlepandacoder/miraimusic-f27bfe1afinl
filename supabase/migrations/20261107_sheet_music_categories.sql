-- Categories for the sheet music library (shown as sections on the "Choose a piece" page).
-- Every signed-in user can read categories; only admins create, rename, reorder or delete them.
-- Requires 20261105_sheet_music_library.sql.

create table if not exists public.sheet_music_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.sheet_music_categories enable row level security;

drop policy if exists "sheet_music_categories_select_signed_in" on public.sheet_music_categories;
create policy "sheet_music_categories_select_signed_in" on public.sheet_music_categories
  for select to authenticated
  using (true);

drop policy if exists "sheet_music_categories_insert_admin" on public.sheet_music_categories;
create policy "sheet_music_categories_insert_admin" on public.sheet_music_categories
  for insert to authenticated
  with check (exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = 'admin'
  ));

drop policy if exists "sheet_music_categories_update_admin" on public.sheet_music_categories;
create policy "sheet_music_categories_update_admin" on public.sheet_music_categories
  for update to authenticated
  using (exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = 'admin'
  ));

drop policy if exists "sheet_music_categories_delete_admin" on public.sheet_music_categories;
create policy "sheet_music_categories_delete_admin" on public.sheet_music_categories
  for delete to authenticated
  using (exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = 'admin'
  ));

-- A song belongs to at most one category. Deleting a category leaves its songs uncategorised.
alter table public.sheet_music_library
  add column if not exists category_id uuid references public.sheet_music_categories(id) on delete set null;

create index if not exists sheet_music_library_category_id_idx
  on public.sheet_music_library (category_id);

-- Admins can move a song to another category.
drop policy if exists "sheet_music_library_update_admin" on public.sheet_music_library;
create policy "sheet_music_library_update_admin" on public.sheet_music_library
  for update to authenticated
  using (exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = 'admin'
  ));

-- Starting categories. Existing library songs go under EASY POP SONGS.
insert into public.sheet_music_categories (name, sort_order)
values ('EASY POP SONGS', 1), ('Trinity Initial Piano', 2), ('Module 1', 3)
on conflict (name) do nothing;

update public.sheet_music_library
set category_id = (select id from public.sheet_music_categories where name = 'EASY POP SONGS')
where category_id is null;
