-- ============================================================
--  Affiliate System
--  Run this once in your Supabase dashboard → SQL Editor
-- ============================================================

-- 1. Affiliates master table
CREATE TABLE IF NOT EXISTS public.affiliates (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT        NOT NULL,
  email             TEXT        NOT NULL,
  code              TEXT        UNIQUE NOT NULL,          -- e.g. JAME4821
  status            TEXT        NOT NULL DEFAULT 'active'
                                CHECK (status IN ('pending','active','suspended')),
  commission_pct    NUMERIC(5,2) NOT NULL DEFAULT 20.00,  -- 20 % per conversion
  total_clicks      INTEGER     NOT NULL DEFAULT 0,
  total_conversions INTEGER     NOT NULL DEFAULT 0,
  total_earnings    NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  payout_email      TEXT,                               -- PayPal / bank email for payouts
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Click events (logged when anyone visits /signup?ref=CODE)
CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT        NOT NULL,
  clicked_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_hash       TEXT,                                   -- hashed for privacy
  user_agent    TEXT,
  converted     BOOLEAN     NOT NULL DEFAULT false      -- flipped when a conversion is recorded
);

-- 3. Conversion events (logged when a referred user completes payment)
CREATE TABLE IF NOT EXISTS public.affiliate_conversions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code              TEXT        NOT NULL,
  click_id          UUID        REFERENCES public.affiliate_clicks(id),
  new_user_id       UUID,
  new_user_email    TEXT,
  plan_amount       NUMERIC(10,2) NOT NULL DEFAULT 8.00,
  commission_amount NUMERIC(10,2) NOT NULL DEFAULT 1.60,  -- 20 % of $8
  converted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_out          BOOLEAN     NOT NULL DEFAULT false
);

-- ── Row Level Security ────────────────────────────────────────────────
ALTER TABLE public.affiliates            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_clicks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_conversions ENABLE ROW LEVEL SECURITY;

-- Affiliate can CRUD their own record
CREATE POLICY "affiliate_own_record"
  ON public.affiliates FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Affiliates can read their own clicks
CREATE POLICY "affiliate_own_clicks"
  ON public.affiliate_clicks FOR SELECT TO authenticated
  USING (code IN (SELECT code FROM public.affiliates WHERE user_id = auth.uid()));

-- ANYONE (anon) can INSERT a click (visitor hasn't logged in yet)
CREATE POLICY "public_click_insert"
  ON public.affiliate_clicks FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Affiliates can read their own conversions
CREATE POLICY "affiliate_own_conversions"
  ON public.affiliate_conversions FOR SELECT TO authenticated
  USING (code IN (SELECT code FROM public.affiliates WHERE user_id = auth.uid()));

-- Authenticated users can INSERT a conversion (happens just after they sign up)
CREATE POLICY "authenticated_conversion_insert"
  ON public.affiliate_conversions FOR INSERT TO authenticated
  WITH CHECK (true);

-- ── Helper function: record a conversion and update affiliate totals ──
CREATE OR REPLACE FUNCTION public.record_affiliate_conversion(
  p_code          TEXT,
  p_click_id      UUID,
  p_user_id       UUID,
  p_user_email    TEXT,
  p_plan_amount   NUMERIC DEFAULT 8.00
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_aff         RECORD;
  v_commission  NUMERIC;
  v_conv_id     UUID;
BEGIN
  -- Validate code
  SELECT * INTO v_aff FROM public.affiliates WHERE code = p_code AND status = 'active';
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Prevent duplicate conversions from same user
  IF EXISTS (SELECT 1 FROM public.affiliate_conversions WHERE new_user_id = p_user_id) THEN
    RETURN NULL;
  END IF;

  v_commission := ROUND(p_plan_amount * v_aff.commission_pct / 100, 2);

  INSERT INTO public.affiliate_conversions
    (code, click_id, new_user_id, new_user_email, plan_amount, commission_amount)
  VALUES
    (p_code, p_click_id, p_user_id, p_user_email, p_plan_amount, v_commission)
  RETURNING id INTO v_conv_id;

  -- Update affiliate totals
  UPDATE public.affiliates SET
    total_conversions = total_conversions + 1,
    total_earnings    = total_earnings + v_commission
  WHERE code = p_code;

  -- Mark click as converted
  IF p_click_id IS NOT NULL THEN
    UPDATE public.affiliate_clicks SET converted = true WHERE id = p_click_id;
  END IF;

  RETURN v_conv_id;
END;
$$;

-- Grant execute to authenticated and anon
GRANT EXECUTE ON FUNCTION public.record_affiliate_conversion TO authenticated, anon;
