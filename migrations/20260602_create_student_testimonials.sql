-- Create student_testimonials table
CREATE TABLE IF NOT EXISTS student_testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  achievement TEXT NOT NULL,
  quote TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🎹',
  video_url TEXT,
  thumbnail_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for sort_order
CREATE INDEX IF NOT EXISTS idx_student_testimonials_sort_order ON student_testimonials(sort_order);

-- Enable RLS
ALTER TABLE student_testimonials ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can view published student testimonials"
  ON student_testimonials
  FOR SELECT
  USING (true);

-- Admin only write access
CREATE POLICY "Admins can insert student testimonials"
  ON student_testimonials
  FOR INSERT
  WITH CHECK (auth.jwt() ->> 'user_role' = 'admin');

CREATE POLICY "Admins can update student testimonials"
  ON student_testimonials
  FOR UPDATE
  USING (auth.jwt() ->> 'user_role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'user_role' = 'admin');

CREATE POLICY "Admins can delete student testimonials"
  ON student_testimonials
  FOR DELETE
  USING (auth.jwt() ->> 'user_role' = 'admin');
