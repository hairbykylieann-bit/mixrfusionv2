-- ============================================================================
-- PIN SECURITY — 2026-07-07
-- 1) pin_attempts: server-side rate limiting for kiosk PIN entry.
--    5 failed attempts per salon within 10 minutes → 5-minute lockout.
-- 2) list_tenant_staff_directory: adds has_pin so the kiosk can offer
--    first-time PIN setup to staff who don't have one yet.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pin_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  success boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pin_attempts_tenant_time
  ON public.pin_attempts (tenant_id, created_at DESC);

-- Only the verify-pin edge function (service role) touches this table.
ALTER TABLE public.pin_attempts ENABLE ROW LEVEL SECURITY;

-- Directory now reports whether each staff member has a PIN configured
DROP FUNCTION IF EXISTS public.list_tenant_staff_directory();

CREATE OR REPLACE FUNCTION public.list_tenant_staff_directory()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  tenant_id uuid,
  name text,
  email text,
  phone text,
  role app_role,
  custom_role_name text,
  is_active boolean,
  invitation_status text,
  created_at timestamptz,
  updated_at timestamptz,
  has_pin boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id, s.user_id, s.tenant_id, s.name, s.email, s.phone,
    s.role, s.custom_role_name, s.is_active, s.invitation_status,
    s.created_at, s.updated_at,
    (s.pin_hash IS NOT NULL) AS has_pin
  FROM public.staff s
  WHERE s.tenant_id = get_user_tenant_id();
$$;

REVOKE EXECUTE ON FUNCTION public.list_tenant_staff_directory() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_tenant_staff_directory() TO authenticated;
