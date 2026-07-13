-- Sheet Music Player: Songs table
-- Stores metadata for MusicXML + MIDI file pairs

CREATE TABLE sheet_music_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  composer TEXT,
  description TEXT,
  difficulty INT CHECK (difficulty >= 1 AND difficulty <= 10),
  base_bpm INT CHECK (base_bpm > 0),
  musicxml_path TEXT NOT NULL, -- Path in 'sheet-music' bucket
  midi_path TEXT NOT NULL,     -- Path in 'sheet-music' bucket
  demo_image_url TEXT,         -- Optional thumbnail
  is_public BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE sheet_music_songs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can read public songs
CREATE POLICY "sheet_music_songs_public_read" ON sheet_music_songs
  FOR SELECT USING (is_public = true);

-- RLS Policy: Authenticated users can read all songs (including private if they're admin/author)
CREATE POLICY "sheet_music_songs_auth_read" ON sheet_music_songs
  FOR SELECT USING (
    auth.role() = 'authenticated' AND (
      is_public = true OR
      created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    )
  );

-- RLS Policy: Only admins and authors can insert
CREATE POLICY "sheet_music_songs_admin_write" ON sheet_music_songs
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    )
  );

-- RLS Policy: Only admins and authors can update their own songs
CREATE POLICY "sheet_music_songs_author_update" ON sheet_music_songs
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND (
      created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    )
  );

-- RLS Policy: Only admins can delete
CREATE POLICY "sheet_music_songs_admin_delete" ON sheet_music_songs
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Track user progress per song (optional, for wait time / accuracy)
CREATE TABLE sheet_music_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES sheet_music_songs(id) ON DELETE CASCADE,
  mode TEXT CHECK (mode IN ('normal', 'wait')),
  accuracy NUMERIC(5, 2), -- Percentage 0-100
  time_taken INT, -- Seconds
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, song_id, mode)
);

ALTER TABLE sheet_music_progress ENABLE ROW LEVEL SECURITY;

-- Users can only see their own progress
CREATE POLICY "sheet_music_progress_user_read" ON sheet_music_progress
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "sheet_music_progress_user_write" ON sheet_music_progress
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "sheet_music_progress_user_update" ON sheet_music_progress
  FOR UPDATE USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_sheet_music_songs_is_public ON sheet_music_songs(is_public);
CREATE INDEX idx_sheet_music_songs_created_by ON sheet_music_songs(created_by);
CREATE INDEX idx_sheet_music_progress_user_id ON sheet_music_progress(user_id);
CREATE INDEX idx_sheet_music_progress_song_id ON sheet_music_progress(song_id);
