-- ============================================================================
-- PERMISSIONS HARDENING — 2026-07-06
-- 1) New per-staff permissions: can_view_own_reports, can_delete_sessions
-- 2) Database-level enforcement: product writes now require the inventory
--    permission (previously ANY staff account could rewrite costs/stock via
--    the API even though the app hid the screens).
-- 3) adjust_product_stock: adds the missing tenant check (was callable
--    against ANY salon's products) + permission check.
-- 4) Session deletion honors can_delete_sessions (managers with the toggle
--    can delete; stylists without it cannot — and the DB enforces it).
-- ============================================================================

-- ── 1. New permission columns ───────────────────────────────────────────────
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS can_view_own_reports boolean NOT NULL DEFAULT true;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS can_delete_sessions boolean NOT NULL DEFAULT false;

UPDATE public.staff SET can_delete_sessions = true WHERE role IN ('owner','admin','manager');
UPDATE public.staff SET can_view_own_reports = false WHERE role IN ('assistant','front_desk');

-- ── 2. Permission helper (single source of truth for DB-side checks) ───────
CREATE OR REPLACE FUNCTION public.current_staff_can(perm text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE ok boolean := false;
BEGIN
  -- Whitelist guards the dynamic SQL
  IF perm NOT IN ('can_manage_products','can_delete_sessions','can_manage_settings',
                  'can_manage_staff','can_create_bowls','can_edit_formulas',
                  'can_view_reports','can_view_own_reports') THEN
    RETURN false;
  END IF;
  EXECUTE format(
    'SELECT EXISTS (
       SELECT 1 FROM public.staff s
       WHERE s.user_id = auth.uid()
         AND s.is_active
         AND s.tenant_id = public.get_user_tenant_id()
         AND (s.role IN (''owner'',''admin'') OR s.%I))',
    perm) INTO ok;
  RETURN COALESCE(ok, false);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.current_staff_can(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_staff_can(text) TO authenticated;

-- ── 3. Product writes require the inventory permission ─────────────────────
DROP POLICY IF EXISTS "Tenant users can create products" ON public.products;
DROP POLICY IF EXISTS "Tenant users can update their products" ON public.products;

CREATE POLICY "Staff with inventory permission can create products"
  ON public.products FOR INSERT
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND public.current_staff_can('can_manage_products')
  );

CREATE POLICY "Staff with inventory permission can update products"
  ON public.products FOR UPDATE
  USING (
    (tenant_id = public.get_user_tenant_id() AND public.current_staff_can('can_manage_products'))
    OR public.is_platform_admin()
  );

-- ── 4. Stock RPC: tenant check + permission check ──────────────────────────
-- (Mixing deducts stock, so can_create_bowls is sufficient; inventory
-- managers can also adjust. SECURITY DEFINER bypasses the product-update
-- policy above ON PURPOSE so stylists can still mix without being able to
-- rewrite costs.)
CREATE OR REPLACE FUNCTION public.adjust_product_stock(p_product_id uuid, p_delta numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_stock numeric;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = p_product_id
      AND p.tenant_id = public.get_user_tenant_id()
  ) THEN
    RAISE EXCEPTION 'Product does not belong to your salon';
  END IF;

  IF NOT (public.current_staff_can('can_create_bowls')
          OR public.current_staff_can('can_manage_products')) THEN
    RAISE EXCEPTION 'You do not have permission to adjust stock';
  END IF;

  UPDATE public.products
  SET stock = GREATEST(0, stock + p_delta),
      updated_at = now()
  WHERE id = p_product_id
  RETURNING stock INTO v_new_stock;

  RETURN v_new_stock;
END;
$$;

-- ── 5. Session deletion honors can_delete_sessions ─────────────────────────
DROP POLICY IF EXISTS "Tenant admins can delete sessions" ON public.color_sessions;

CREATE POLICY "Staff with delete permission can delete sessions"
  ON public.color_sessions FOR DELETE
  USING (
    tenant_id = public.get_user_tenant_id()
    AND public.current_staff_can('can_delete_sessions')
  );

-- ── 6. Expose new columns through the staff-self RPC ────────────────────────
DROP FUNCTION IF EXISTS public.get_current_staff_self();

CREATE OR REPLACE FUNCTION public.get_current_staff_self()
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
  can_manage_staff boolean,
  can_view_reports boolean,
  can_manage_products boolean,
  can_manage_settings boolean,
  can_manage_clients boolean,
  can_view_basic_client_info boolean,
  can_create_bowls boolean,
  can_view_all_clients boolean,
  can_manage_own_clients boolean,
  can_view_product_costs boolean,
  can_view_own_commission boolean,
  can_edit_formulas boolean,
  can_view_own_reports boolean,
  can_delete_sessions boolean
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
    s.can_manage_staff, s.can_view_reports, s.can_manage_products,
    s.can_manage_settings, s.can_manage_clients, s.can_view_basic_client_info,
    s.can_create_bowls, s.can_view_all_clients, s.can_manage_own_clients,
    s.can_view_product_costs, s.can_view_own_commission, s.can_edit_formulas,
    s.can_view_own_reports, s.can_delete_sessions
  FROM public.staff s
  WHERE s.user_id = auth.uid()
    AND s.tenant_id = get_user_tenant_id()
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_current_staff_self() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_staff_self() TO authenticated;
