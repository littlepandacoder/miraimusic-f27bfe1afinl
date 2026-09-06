-- Enhance user_sessions table for better iPad and cross-device tracking
-- Adds device detection, user agent, and better timestamp tracking

-- If user_sessions table doesn't exist, create it
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_type TEXT DEFAULT 'unknown',
  user_agent TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);

-- Create index for active sessions (not ended)
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(user_id, ended_at) WHERE ended_at IS NULL;

-- Create index for device tracking
CREATE INDEX IF NOT EXISTS idx_user_sessions_device ON public.user_sessions(device_type);

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own sessions
CREATE POLICY "users_can_view_own_sessions" ON public.user_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own sessions
CREATE POLICY "users_can_insert_own_sessions" ON public.user_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own sessions
CREATE POLICY "users_can_update_own_sessions" ON public.user_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Admin can do anything
CREATE POLICY "admin_can_manage_all_sessions" ON public.user_sessions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  );

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF NOT EXISTS update_user_sessions_timestamp ON public.user_sessions;
CREATE TRIGGER update_user_sessions_timestamp
  BEFORE UPDATE ON public.user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_sessions_updated_at();
