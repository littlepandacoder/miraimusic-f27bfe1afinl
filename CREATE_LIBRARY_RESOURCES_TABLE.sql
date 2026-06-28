-- Create library_resources table in public schema
CREATE TABLE IF NOT EXISTS public.library_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('pdf', 'zip', 'document', 'video', 'audio')),
  access_level TEXT NOT NULL DEFAULT 'students' CHECK (access_level IN ('public', 'students', 'premium')),
  category TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uploaded_by_name TEXT,
  tags TEXT[] DEFAULT '{}',
  download_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_library_resources_category ON public.library_resources(category);
CREATE INDEX IF NOT EXISTS idx_library_resources_access_level ON public.library_resources(access_level);
CREATE INDEX IF NOT EXISTS idx_library_resources_uploaded_by ON public.library_resources(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_library_resources_is_active ON public.library_resources(is_active);
CREATE INDEX IF NOT EXISTS idx_library_resources_created_at ON public.library_resources(created_at DESC);

-- Create function to increment download count
CREATE OR REPLACE FUNCTION public.increment_download_count(resource_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.library_resources
  SET download_count = download_count + 1
  WHERE id = resource_id;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE public.library_resources ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow public read" ON public.library_resources
  FOR SELECT
  USING (is_active = true AND access_level = 'public');

CREATE POLICY "Allow students read" ON public.library_resources
  FOR SELECT
  USING (is_active = true AND access_level IN ('public', 'students'));

CREATE POLICY "Allow authenticated upload" ON public.library_resources
  FOR INSERT
  WITH CHECK (
    auth.uid() = uploaded_by
    AND EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' IN ('teacher', 'admin')
    )
  );

CREATE POLICY "Allow upload without auth check" ON public.library_resources
  FOR INSERT
  WITH CHECK (uploaded_by IS NOT NULL);

CREATE POLICY "Allow teachers update own" ON public.library_resources
  FOR UPDATE
  USING (auth.uid() = uploaded_by)
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Allow teachers delete own" ON public.library_resources
  FOR DELETE
  USING (auth.uid() = uploaded_by);

CREATE POLICY "Admins manage all" ON public.library_resources
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );
