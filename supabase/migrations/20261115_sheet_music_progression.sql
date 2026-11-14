-- Progression step for songs inside a library category (e.g. "Module 1").
-- Songs with a step are shown in that order and labelled "Step n" in the Piano Room library.
alter table public.sheet_music_library
  add column if not exists progression_step integer check (progression_step > 0);

update public.sheet_music_library as l
set progression_step = case l.title
  when 'Lesson 1 CDE' then 1
  when 'CDE Half Notes' then 2
  when 'CDE Whole notes' then 3
  when 'Sunshine' then 4
  when 'Star Lord' then 5
  when 'waltz in the dark a minor' then 6
end
where l.category_id = (select id from public.sheet_music_categories where name = 'Module 1');
