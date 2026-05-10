-- Fix 1: Add unique constraint on user_subscriptions.user_id
--   (required for ON CONFLICT upsert to work)
ALTER TABLE public.user_subscriptions
  ADD CONSTRAINT IF NOT EXISTS user_subscriptions_user_id_key UNIQUE (user_id);

-- Fix 2: Create a SECURITY DEFINER RPC that records a PayPal subscription
--   AND assigns the student role in one atomic call.
--   This runs as the DB owner (bypasses RLS) so it works even before the
--   email-confirmation session is fully established.
CREATE OR REPLACE FUNCTION public.record_paypal_subscription(
  p_user_id      uuid,
  p_sub_id       text,
  p_plan_id      text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Upsert the subscription record
  INSERT INTO public.user_subscriptions (user_id, subscription_id, plan_id, status)
  VALUES (p_user_id, p_sub_id, p_plan_id, 'active')
  ON CONFLICT (user_id) DO UPDATE
    SET subscription_id = EXCLUDED.subscription_id,
        plan_id         = EXCLUDED.plan_id,
        status          = 'active',
        updated_at      = now();

  -- Ensure student role exists (trigger may have already done this)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'student')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Grant execute to authenticated users (session must exist)
GRANT EXECUTE ON FUNCTION public.record_paypal_subscription TO authenticated;

-- Fix 3: Also allow the service-role / anon path as a safety net
--   (useful if the session races with email confirmation)
GRANT EXECUTE ON FUNCTION public.record_paypal_subscription TO anon;
