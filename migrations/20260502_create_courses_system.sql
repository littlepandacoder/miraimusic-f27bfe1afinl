-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  instructor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instructor_name TEXT,
  thumbnail TEXT,
  price DECIMAL(10, 2) DEFAULT 0,
  level TEXT DEFAULT 'beginner' CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create course_videos table
CREATE TABLE IF NOT EXISTS course_videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  duration INTEGER DEFAULT 0,
  "order" INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create course_notes table
CREATE TABLE IF NOT EXISTS course_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  "order" INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create course_enrollments table
CREATE TABLE IF NOT EXISTS course_enrollments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(course_id, user_id)
);

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_course_videos_course ON course_videos(course_id);
CREATE INDEX IF NOT EXISTS idx_course_notes_course ON course_notes(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user ON course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies for courses
CREATE POLICY "Courses are viewable by everyone" ON courses
  FOR SELECT USING (true);

CREATE POLICY "Instructors can insert their own courses" ON courses
  FOR INSERT WITH CHECK (instructor_id = auth.uid());

CREATE POLICY "Instructors can update their own courses" ON courses
  FOR UPDATE USING (instructor_id = auth.uid()) 
  WITH CHECK (instructor_id = auth.uid());

CREATE POLICY "Instructors can delete their own courses" ON courses
  FOR DELETE USING (instructor_id = auth.uid());

-- Policies for course_videos
CREATE POLICY "Course videos are viewable by everyone" ON course_videos
  FOR SELECT USING (true);

CREATE POLICY "Instructors can manage their course videos" ON course_videos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM courses WHERE id = course_id AND instructor_id = auth.uid())
  );

CREATE POLICY "Instructors can update their course videos" ON course_videos
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM courses WHERE id = course_id AND instructor_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM courses WHERE id = course_id AND instructor_id = auth.uid())
  );

CREATE POLICY "Instructors can delete their course videos" ON course_videos
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM courses WHERE id = course_id AND instructor_id = auth.uid())
  );

-- Policies for course_notes
CREATE POLICY "Course notes are viewable by everyone" ON course_notes
  FOR SELECT USING (true);

CREATE POLICY "Instructors can manage their course notes" ON course_notes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM courses WHERE id = course_id AND instructor_id = auth.uid())
  );

CREATE POLICY "Instructors can update their course notes" ON course_notes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM courses WHERE id = course_id AND instructor_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM courses WHERE id = course_id AND instructor_id = auth.uid())
  );

CREATE POLICY "Instructors can delete their course notes" ON course_notes
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM courses WHERE id = course_id AND instructor_id = auth.uid())
  );

-- Policies for course_enrollments
CREATE POLICY "Users can view their own enrollments" ON course_enrollments
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can enroll in courses" ON course_enrollments
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Policies for user_subscriptions
CREATE POLICY "Users can view their own subscription" ON user_subscriptions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own subscription" ON user_subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid());
