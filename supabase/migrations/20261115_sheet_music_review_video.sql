-- Optional Fundamentals video that a library song reviews first (shows the "REVIEW LESSON" pop-up).
alter table public.sheet_music_library
  add column if not exists review_video_title text,
  add column if not exists review_video_url text;
