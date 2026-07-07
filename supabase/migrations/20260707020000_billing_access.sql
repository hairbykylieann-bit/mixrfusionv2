-- ============================================================================
-- BILLING ACCESS + SEED PLANS — 2026-07-07
-- Salon owners need to SEE plans and their own subscription so the in-app
-- billing card works. Writes stay platform/webhook-only (service role).
-- Seeds Kylie's three tiers (prices editable anytime in HQ → Plans).
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view active plans" ON public.plans;
CREATE POLICY "Authenticated users can view active plans"
  ON public.plans FOR SELECT
  USING (is_active = true AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Tenant users can view their subscription" ON public.subscriptions;
CREATE POLICY "Tenant users can view their subscription"
  ON public.subscriptions FOR SELECT
  USING (tenant_id = public.get_user_tenant_id() OR public.is_platform_admin());

-- Seed the three tiers if no plans exist yet (idempotent)
INSERT INTO public.plans (name, base_price_cents, seat_price_cents, currency, features_json, is_active)
SELECT * FROM (VALUES
  ('Solo',   4500, 0, 'usd', '{"max_staff": 2,   "blurb": "For independents and duos"}'::jsonb, true),
  ('Team',   8500, 0, 'usd', '{"max_staff": 7,   "blurb": "For growing salons"}'::jsonb,        true),
  ('Studio', 10500, 0, 'usd', '{"max_staff": 999, "blurb": "For full salon teams"}'::jsonb,      true)
) AS seed(name, base_price_cents, seat_price_cents, currency, features_json, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.plans);
