-- Link each Module 1 lesson to a Fundamentals video it reviews first (best fit by title; editable).
update public.sheet_music_library as l
set review_video_title = m.video_title,
    review_video_url = (select v.url from public.lesson_videos v where v.title = m.video_title and v.url is not null limit 1)
from (values
  ('Lesson 1 CDE', 'Treble Clef NOtes'),
  ('CDE Half Notes', 'WHAT IS RHYTHM (1)'),
  ('CDE Whole notes', 'Time Signature'),
  ('Sunshine', 'Name of the keys'),
  ('Star Lord', 'Etude 1'),
  ('waltz in the dark a minor', 'Coordination')
) as m(song_title, video_title)
where l.title = m.song_title
  and l.category_id = (select id from public.sheet_music_categories where name = 'Module 1');
