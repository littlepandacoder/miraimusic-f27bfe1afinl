-- Thumbnail image for each sheet music category (shown as the category tile on the library page).
-- Uses the existing private 'sheet-music-thumbs' bucket. Requires 20261107_sheet_music_categories.sql.

alter table public.sheet_music_categories
  add column if not exists thumbnail_path text;
