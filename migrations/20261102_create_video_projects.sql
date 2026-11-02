-- Create video_projects table for the Musicable Video Player Platform
-- This table stores interactive piano tutorial video project metadata

CREATE TABLE IF NOT EXISTS video_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_name TEXT NOT NULL,

  -- Video and audio assets
  video_url TEXT,
  audio_url TEXT,
  waveform_data JSONB, -- Stores waveform visualization data

  -- Music notation assets
  sheet_music_url TEXT,
  midi_url TEXT,

  -- Synchronization and publishing
  synchronization_status TEXT DEFAULT 'pending' CHECK (synchronization_status IN ('pending', 'processing', 'completed', 'failed')),
  published BOOLEAN DEFAULT FALSE,

  -- Engagement metrics
  total_checkpoints INTEGER DEFAULT 0,
  student_interactions INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_video_projects_creator_id ON video_projects(creator_id);
CREATE INDEX IF NOT EXISTS idx_video_projects_published ON video_projects(published);
CREATE INDEX IF NOT EXISTS idx_video_projects_status ON video_projects(synchronization_status);
CREATE INDEX IF NOT EXISTS idx_video_projects_created_at ON video_projects(created_at DESC);

-- Enable row-level security
ALTER TABLE video_projects ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow admins to view and manage all projects
CREATE POLICY "Admin view all video projects"
ON video_projects FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admin insert video projects"
ON video_projects FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admin update video projects"
ON video_projects FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admin delete video projects"
ON video_projects FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Allow creators to view their own projects
CREATE POLICY "Creators view own projects"
ON video_projects FOR SELECT
USING (creator_id = auth.uid());

-- Allow students to view published projects
CREATE POLICY "Students view published projects"
ON video_projects FOR SELECT
USING (published = TRUE);
