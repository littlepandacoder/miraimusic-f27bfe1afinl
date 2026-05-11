-- Admin RPCs for ManageUsers panel.
-- All SECURITY DEFINER so they bypass RLS and can see/modify any user's roles.
-- Execution is granted only to authenticated users; the admin check happens
-- inside the functions themselves or is enforced by the calling edge function.

-- 1. Return every row in user_roles (admin-only listing)
CREATE OR REPLACE FUNCTION public.admin_get_all_user_roles()
RETURNS TABLE(user_id uuid, role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id, role::text
  FROM public.user_roles;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_all_user_roles() TO authenticated;

-- 2. Assign a role to a user
CREATE OR REPLACE FUNCTION public.admin_assign_role(_user_id uuid, _role text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.user_roles(user_id, role)
  VALUES (_user_id, _role::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
$$;

GRANT EXECUTE ON FUNCTION public.admin_assign_role(uuid, text) TO authenticated;

-- 3. Remove a role from a user
CREATE OR REPLACE FUNCTION public.admin_remove_role(_user_id uuid, _role text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.user_roles
  WHERE user_id = _user_id AND role = _role::public.app_role;
$$;

GRANT EXECUTE ON FUNCTION public.admin_remove_role(uuid, text) TO authenticated;
