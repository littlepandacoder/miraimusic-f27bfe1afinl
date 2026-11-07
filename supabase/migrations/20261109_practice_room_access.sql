-- Live practice room: a student's room ("room:<student id>") can be joined by the student and by
-- their assigned teacher (teacher_students). Used for presence (online) and shared controls.

drop policy if exists "practice_room_read" on realtime.messages;
create policy "practice_room_read" on realtime.messages
  for select to authenticated
  using (
    realtime.topic() = 'room:' || (select auth.uid())::text
    or exists (
      select 1 from public.teacher_students ts
      where ts.teacher_id = (select auth.uid())
        and realtime.topic() = 'room:' || ts.student_id::text
    )
  );

drop policy if exists "practice_room_write" on realtime.messages;
create policy "practice_room_write" on realtime.messages
  for insert to authenticated
  with check (
    realtime.topic() = 'room:' || (select auth.uid())::text
    or exists (
      select 1 from public.teacher_students ts
      where ts.teacher_id = (select auth.uid())
        and realtime.topic() = 'room:' || ts.student_id::text
    )
  );
