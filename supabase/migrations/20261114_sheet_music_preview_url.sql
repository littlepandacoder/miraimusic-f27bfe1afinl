-- iTunes 30-second preview link for each library song, filled in by enrich-sheet-music.
alter table public.sheet_music_library
  add column if not exists preview_url text;
