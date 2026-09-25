-- Table for storing music sync data (MusicXML + sync points)
CREATE TABLE IF NOT EXISTS public.module_music_sync (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL UNIQUE REFERENCES public.course_modules(id) ON DELETE CASCADE,
  musicxml_data text,
  sync_points jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.module_music_sync ENABLE ROW LEVEL SECURITY;

-- Anyone can read sync data (for displaying during lesson)
CREATE POLICY "Anyone can view music sync"
  ON public.module_music_sync FOR SELECT
  USING (true);

-- Only admins can write
CREATE POLICY "Only admins can write music sync"
  ON public.module_music_sync FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Add index for faster lookups
CREATE INDEX idx_module_music_sync_module_id ON public.module_music_sync(module_id);
