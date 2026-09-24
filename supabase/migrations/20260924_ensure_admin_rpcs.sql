-- Ensure admin RPCs exist
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

-- RPC to get all users with their emails for admin panels
CREATE OR REPLACE FUNCTION public.admin_get_users_with_emails()
RETURNS TABLE(
  user_id uuid,
  email text,
  full_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    au.email,
    p.full_name
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.user_id = au.id
  ORDER BY COALESCE(p.full_name, au.email);
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_users_with_emails() TO authenticated;
