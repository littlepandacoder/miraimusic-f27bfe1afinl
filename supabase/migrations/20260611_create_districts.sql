-- Create districts table
CREATE TABLE IF NOT EXISTS public.districts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create district_members table
CREATE TABLE IF NOT EXISTS public.district_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id UUID NOT NULL REFERENCES public.districts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('teacher', 'student')),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE(district_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_districts_created_by ON public.districts(created_by);
CREATE INDEX IF NOT EXISTS idx_district_members_district_id ON public.district_members(district_id);
CREATE INDEX IF NOT EXISTS idx_district_members_user_id ON public.district_members(user_id);
CREATE INDEX IF NOT EXISTS idx_district_members_role ON public.district_members(role);

-- Enable RLS
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.district_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "admins_can_manage_districts" ON public.districts;
DROP POLICY IF EXISTS "users_can_view_their_districts" ON public.districts;
DROP POLICY IF EXISTS "admins_can_manage_members" ON public.district_members;
DROP POLICY IF EXISTS "users_can_view_their_district_members" ON public.district_members;

-- RLS Policies for districts
CREATE POLICY "admins_can_manage_districts" ON public.districts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "users_can_view_their_districts" ON public.districts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.district_members
      WHERE district_members.district_id = districts.id
      AND district_members.user_id = auth.uid()
    )
  );

-- RLS Policies for district_members
CREATE POLICY "admins_can_manage_members" ON public.district_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "users_can_view_their_district_members" ON public.district_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.district_members dm
      WHERE dm.district_id = district_members.district_id
      AND dm.user_id = auth.uid()
    )
  );
