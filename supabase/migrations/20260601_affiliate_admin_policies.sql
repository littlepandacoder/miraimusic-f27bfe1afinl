-- ============================================================
--  Affiliate Admin Policies
--  Run this AFTER 20260601_affiliate_system.sql
-- ============================================================

-- Admins can read all affiliates
CREATE POLICY "admin_read_affiliates"
  ON public.affiliates FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Admins can update any affiliate (status, commission, notes)
CREATE POLICY "admin_update_affiliates"
  ON public.affiliates FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Admins can read all clicks
CREATE POLICY "admin_read_clicks"
  ON public.affiliate_clicks FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Admins can read + update all conversions (e.g. mark paid_out = true)
CREATE POLICY "admin_all_conversions"
  ON public.affiliate_conversions FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
