-- One row per finished practice session of a sheet music song (Piano Room player).
-- wait = "Wait for note" mode (score = % of notes played right first time)
-- sync = "Sync performance" mode (score = overall pitch + rhythm %)
-- Plays per song = count of rows for that song_key.

create table if not exists public.sheet_music_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  song_key        text not null,              -- 'lib-<library id>' or the saved upload id
  song_title      text not null,
  mode            text not null check (mode in ('wait', 'sync')),
  score           numeric(5,2) not null,
  pitch_accuracy  numeric(5,2),
  rhythm_accuracy numeric(5,2),
  notes_total     integer not null default 0,
  notes_right     integer not null default 0,
  wrong_presses   integer not null default 0,
  late_count      integer,
  early_count     integer,
  on_time_count   integer,
  analysis        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists sheet_music_sessions_user_song_idx
  on public.sheet_music_sessions (user_id, song_key, created_at desc);

alter table public.sheet_music_sessions enable row level security;

-- Students: save and read their own sessions.
drop policy if exists "sheet_music_sessions_insert_own" on public.sheet_music_sessions;
create policy "sheet_music_sessions_insert_own"
  on public.sheet_music_sessions for insert
  with check (user_id = auth.uid());

drop policy if exists "sheet_music_sessions_select_own" on public.sheet_music_sessions;
create policy "sheet_music_sessions_select_own"
  on public.sheet_music_sessions for select
  using (user_id = auth.uid());

-- Teachers: read sessions of their linked students.
drop policy if exists "sheet_music_sessions_select_teacher" on public.sheet_music_sessions;
create policy "sheet_music_sessions_select_teacher"
  on public.sheet_music_sessions for select
  using (
    exists (
      select 1 from public.teacher_students ts
      where ts.teacher_id = auth.uid() and ts.student_id = sheet_music_sessions.user_id
    )
  );

-- Admins: read everything.
drop policy if exists "sheet_music_sessions_select_admin" on public.sheet_music_sessions;
create policy "sheet_music_sessions_select_admin"
  on public.sheet_music_sessions for select
  using (public.has_role(auth.uid(), 'admin'));
