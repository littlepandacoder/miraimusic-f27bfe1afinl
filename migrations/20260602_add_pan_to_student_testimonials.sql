-- Add pan positioning fields to student_testimonials
ALTER TABLE student_testimonials
ADD COLUMN pan_x INTEGER DEFAULT 0,
ADD COLUMN pan_y INTEGER DEFAULT 0;
