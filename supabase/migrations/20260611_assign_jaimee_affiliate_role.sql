-- Assign affiliate role to jaimee@musicable.app
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'affiliate' FROM public.affiliates
WHERE email = 'jaimee@musicable.app'
AND user_id NOT IN (
  SELECT user_id FROM public.user_roles WHERE role = 'affiliate'
)
ON CONFLICT DO NOTHING;
