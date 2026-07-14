-- Comprehensive Row Level Security (RLS) Setup
-- This migration ensures all tables have RLS enabled with appropriate policies

-- ========================================
-- HELPER: Get user's role
-- ========================================
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM auth.users WHERE id = user_id LIMIT 1;
$$ LANGUAGE SQL;

-- ========================================
-- PROFILES TABLE
-- ========================================
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ========================================
-- USER ROLES TABLE
-- ========================================
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;

CREATE POLICY "Admins can view user roles"
  ON public.user_roles FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.user_roles WHERE role = 'admin'
    )
  );

CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- ========================================
-- LESSONS & LESSON PLANS
-- ========================================
ALTER TABLE IF EXISTS public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lesson_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lesson_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lesson_plan_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.student_lesson_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can view own lessons" ON public.lessons;
DROP POLICY IF EXISTS "Teachers can manage own lessons" ON public.lessons;

CREATE POLICY "Teachers can view own lessons"
  ON public.lessons FOR SELECT
  USING (
    auth.uid() = teacher_id OR
    auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
  );

CREATE POLICY "Teachers can manage own lessons"
  ON public.lessons FOR ALL
  USING (
    auth.uid() = teacher_id OR
    auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
  )
  WITH CHECK (
    auth.uid() = teacher_id OR
    auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
  );

-- ========================================
-- CLASSES & STUDENTS
-- ========================================
ALTER TABLE IF EXISTS public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.teacher_students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can view own classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can manage own classes" ON public.classes;

CREATE POLICY "Teachers can view own classes"
  ON public.classes FOR SELECT
  USING (
    auth.uid() = teacher_id OR
    auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
  );

CREATE POLICY "Teachers can manage own classes"
  ON public.classes FOR ALL
  USING (
    auth.uid() = teacher_id OR
    auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
  )
  WITH CHECK (
    auth.uid() = teacher_id OR
    auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
  );

-- ========================================
-- DISTRICTS & SCHOOLS
-- ========================================
ALTER TABLE IF EXISTS public.districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.district_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.district_teachers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all districts" ON public.districts;
DROP POLICY IF EXISTS "District members can view their district" ON public.districts;

CREATE POLICY "Admins can view all districts"
  ON public.districts FOR SELECT
  USING (
    auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
  );

CREATE POLICY "District members can view their district"
  ON public.districts FOR SELECT
  USING (
    id IN (
      SELECT district_id FROM public.district_members WHERE user_id = auth.uid()
    )
  );

-- ========================================
-- SUBSCRIPTIONS & PAYMENTS
-- ========================================
ALTER TABLE IF EXISTS public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;

CREATE POLICY "Users can view own subscriptions"
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

-- ========================================
-- COURSES & PROGRESS
-- ========================================
ALTER TABLE IF EXISTS public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.course_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Courses are viewable by enrolled users" ON public.courses;

CREATE POLICY "Courses are viewable by enrolled users"
  ON public.courses FOR SELECT
  USING (
    is_public = true OR
    id IN (
      SELECT course_id FROM public.course_progress WHERE user_id = auth.uid()
    ) OR
    auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
  );

-- ========================================
-- FOUNDATION CONTENT
-- ========================================
ALTER TABLE IF EXISTS public.foundation_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.foundation_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.student_foundation_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Foundation content viewable by teachers and admins" ON public.foundation_modules;

CREATE POLICY "Foundation content viewable by teachers and admins"
  ON public.foundation_modules FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.user_roles WHERE role IN ('teacher', 'admin')
    )
  );

-- ========================================
-- SHEET MUSIC
-- ========================================
ALTER TABLE IF EXISTS public.sheet_music_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sheet_music_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sheet music songs viewable by all authenticated" ON public.sheet_music_songs;
DROP POLICY IF EXISTS "Users can view own sheet music progress" ON public.sheet_music_progress;

CREATE POLICY "Sheet music songs viewable by all authenticated"
  ON public.sheet_music_songs FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view own sheet music progress"
  ON public.sheet_music_progress FOR SELECT
  USING (auth.uid() = user_id);

-- ========================================
-- BOOKINGS & AVAILABILITY
-- ========================================
ALTER TABLE IF EXISTS public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.available_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Teachers can view available slots" ON public.available_slots;

CREATE POLICY "Users can view own bookings"
  ON public.bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Teachers can view available slots"
  ON public.available_slots FOR SELECT
  USING (
    auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role IN ('teacher', 'admin'))
  );

-- ========================================
-- AFFILIATE SYSTEM
-- ========================================
ALTER TABLE IF EXISTS public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.affiliate_conversions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own affiliate data" ON public.affiliates;

CREATE POLICY "Users can view own affiliate data"
  ON public.affiliates FOR SELECT
  USING (auth.uid() = user_id);

-- ========================================
-- TEACHER SEATS
-- ========================================
ALTER TABLE IF EXISTS public.teacher_seats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can manage own seats" ON public.teacher_seats;

CREATE POLICY "Teachers can manage own seats"
  ON public.teacher_seats FOR ALL
  USING (auth.uid() = teacher_id);

-- ========================================
-- MUSIC THEORY QUIZ
-- ========================================
ALTER TABLE IF EXISTS public.music_theory_quiz_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own quiz results" ON public.music_theory_quiz_results;

CREATE POLICY "Users can view own quiz results"
  ON public.music_theory_quiz_results FOR SELECT
  USING (auth.uid() = user_id);

-- Log completion
SELECT 'RLS policies configured successfully' as status;
