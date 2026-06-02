-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view published student testimonials" ON student_testimonials;
DROP POLICY IF EXISTS "Admins can insert student testimonials" ON student_testimonials;
DROP POLICY IF EXISTS "Admins can update student testimonials" ON student_testimonials;
DROP POLICY IF EXISTS "Admins can delete student testimonials" ON student_testimonials;

-- Public read access
CREATE POLICY "Anyone can view student testimonials"
  ON student_testimonials
  FOR SELECT
  USING (true);

-- Admin only write access (check user_roles table)
CREATE POLICY "Admins can insert student testimonials"
  ON student_testimonials
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update student testimonials"
  ON student_testimonials
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete student testimonials"
  ON student_testimonials
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );
