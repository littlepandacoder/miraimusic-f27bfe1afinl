-- ── Teacher seat & roster system ─────────────────────────────────────────────

-- Tracks how many student seats a teacher has (default 10 after subscribing)
CREATE TABLE IF NOT EXISTS public.teacher_seats (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_seats  int  NOT NULL DEFAULT 10,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(teacher_id)
);

-- Explicit teacher → student roster (separate from lesson bookings)
CREATE TABLE IF NOT EXISTS public.teacher_students (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, student_id)
);

ALTER TABLE public.teacher_seats    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_students ENABLE ROW LEVEL SECURITY;

-- teacher_seats policies
CREATE POLICY "ts_select" ON public.teacher_seats FOR SELECT TO authenticated
  USING (auth.uid() = teacher_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "ts_admin"  ON public.teacher_seats FOR ALL    TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- teacher_students policies
CREATE POLICY "tst_select" ON public.teacher_students FOR SELECT TO authenticated
  USING (auth.uid() = teacher_id OR auth.uid() = student_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "tst_insert" ON public.teacher_students FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = teacher_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "tst_delete" ON public.teacher_students FOR DELETE TO authenticated
  USING (auth.uid() = teacher_id OR has_role(auth.uid(), 'admin'::app_role));

-- ── RPCs ──────────────────────────────────────────────────────────────────────

-- Returns seat info for a teacher
CREATE OR REPLACE FUNCTION public.get_teacher_seat_info(p_teacher_id uuid DEFAULT auth.uid())
RETURNS TABLE(total_seats int, used_seats bigint, available_seats int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COALESCE(ts.total_seats, 0),
    (SELECT COUNT(*)::bigint FROM teacher_students WHERE teacher_id = p_teacher_id),
    COALESCE(ts.total_seats, 0) - (SELECT COUNT(*)::int FROM teacher_students WHERE teacher_id = p_teacher_id)
  FROM teacher_seats ts
  WHERE ts.teacher_id = p_teacher_id;
$$;
GRANT EXECUTE ON FUNCTION public.get_teacher_seat_info TO authenticated;

-- Adds extra seats after payment
CREATE OR REPLACE FUNCTION public.teacher_add_seats(p_teacher_id uuid, p_seats int)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO teacher_seats (teacher_id, total_seats)
  VALUES (p_teacher_id, p_seats)
  ON CONFLICT (teacher_id) DO UPDATE
    SET total_seats = teacher_seats.total_seats + p_seats,
        updated_at  = now();
$$;
GRANT EXECUTE ON FUNCTION public.teacher_add_seats TO authenticated;

-- Called after teacher pays $20/month PayPal subscription
CREATE OR REPLACE FUNCTION public.record_teacher_subscription(
  p_user_id uuid,
  p_sub_id  text,
  p_plan_id text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Upsert active subscription
  INSERT INTO user_subscriptions (user_id, subscription_id, plan_id, status)
  VALUES (p_user_id, p_sub_id, p_plan_id, 'active')
  ON CONFLICT (user_id) DO UPDATE
    SET subscription_id = EXCLUDED.subscription_id,
        plan_id         = EXCLUDED.plan_id,
        status          = 'active',
        updated_at      = now();

  -- Replace any existing role with teacher
  DELETE FROM user_roles WHERE user_id = p_user_id;
  INSERT INTO user_roles (user_id, role)
  VALUES (p_user_id, 'teacher')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Provision 10 default seats (idempotent)
  INSERT INTO teacher_seats (teacher_id, total_seats)
  VALUES (p_user_id, 10)
  ON CONFLICT (teacher_id) DO NOTHING;
END;
$$;
GRANT EXECUTE ON FUNCTION public.record_teacher_subscription TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_teacher_subscription TO anon;
