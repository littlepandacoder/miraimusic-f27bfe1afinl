-- Add pause functionality to user subscriptions
ALTER TABLE public.user_subscriptions
ADD COLUMN paused_at timestamptz DEFAULT NULL,
ADD COLUMN pause_reason text DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.user_subscriptions.paused_at IS 'Timestamp when membership was paused; NULL if active';
COMMENT ON COLUMN public.user_subscriptions.pause_reason IS 'Optional reason for pause (admin-set)';

-- Create RPC function to pause/resume membership
CREATE OR REPLACE FUNCTION public.admin_pause_membership(
  _user_id uuid,
  _pause boolean DEFAULT true,
  _reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Check if admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN json_build_object('error', 'Only admins can pause memberships');
  END IF;

  -- Update subscription
  UPDATE public.user_subscriptions
  SET
    paused_at = CASE WHEN _pause THEN now() ELSE NULL END,
    pause_reason = CASE WHEN _pause THEN _reason ELSE NULL END,
    updated_at = now()
  WHERE user_id = _user_id
  RETURNING user_id INTO v_user_id;

  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'User subscription not found');
  END IF;

  RETURN json_build_object(
    'success', true,
    'paused', _pause,
    'message', CASE WHEN _pause THEN 'Membership paused' ELSE 'Membership resumed' END
  );
END;
$$;

-- Grant execute to authenticated users (will be checked via admin role in function)
GRANT EXECUTE ON FUNCTION public.admin_pause_membership(uuid, boolean, text) TO authenticated;
