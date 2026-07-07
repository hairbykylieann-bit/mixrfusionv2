-- Phase 1: Permission Helper Functions
-- These SECURITY DEFINER functions check staff permissions without RLS recursion

-- Check if current user's staff has a specific permission
CREATE OR REPLACE FUNCTION public.current_staff_has_permission(permission_name text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT 
      CASE permission_name
        WHEN 'can_view_basic_client_info' THEN can_view_basic_client_info
        WHEN 'can_view_all_clients' THEN can_view_all_clients
        WHEN 'can_view_product_costs' THEN can_view_product_costs
        WHEN 'can_view_reports' THEN can_view_reports
        WHEN 'can_manage_staff' THEN can_manage_staff
        WHEN 'can_manage_clients' THEN can_manage_clients
        WHEN 'can_manage_products' THEN can_manage_products
        WHEN 'can_manage_settings' THEN can_manage_settings
        ELSE false
      END
    FROM public.staff
    WHERE user_id = auth.uid()
      AND tenant_id = get_user_tenant_id()
    LIMIT 1),
    false
  )
$$;

-- Check if current user is admin or owner
CREATE OR REPLACE FUNCTION public.current_staff_is_admin_or_owner()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff
    WHERE user_id = auth.uid()
      AND tenant_id = get_user_tenant_id()
      AND role IN ('admin', 'owner')
  )
$$;

-- Phase 3: Financial Data Restriction (before views since views depend on base RLS)
-- Restrict invoices to admin/owner only
DROP POLICY IF EXISTS "Tenant members can view their invoices" ON invoices;
CREATE POLICY "Admins can view tenant invoices"
ON invoices FOR SELECT TO authenticated
USING (
  (tenant_id = get_user_tenant_id() AND current_staff_is_admin_or_owner())
  OR is_platform_admin()
);

-- Restrict payments to admin/owner only
DROP POLICY IF EXISTS "Tenant members can view their payments" ON payments;
CREATE POLICY "Admins can view tenant payments"
ON payments FOR SELECT TO authenticated
USING (
  (tenant_id = get_user_tenant_id() AND current_staff_is_admin_or_owner())
  OR is_platform_admin()
);

-- Restrict subscriptions to admin/owner only
DROP POLICY IF EXISTS "Tenant members can view their subscription" ON subscriptions;
CREATE POLICY "Admins can view tenant subscription"
ON subscriptions FOR SELECT TO authenticated
USING (
  (tenant_id = get_user_tenant_id() AND current_staff_is_admin_or_owner())
  OR is_platform_admin()
);

-- Phase 4: Usage Metrics Restriction
DROP POLICY IF EXISTS "Tenant members can view their usage" ON usage_daily;
CREATE POLICY "Staff with reports permission can view usage"
ON usage_daily FOR SELECT TO authenticated
USING (
  (tenant_id = get_user_tenant_id() AND current_staff_has_permission('can_view_reports'))
  OR is_platform_admin()
);

-- Phase 2: Client Protection Views
-- View for basic client info (no contact details) - for staff without contact permission
CREATE OR REPLACE VIEW public.clients_basic
WITH (security_invoker = true)
AS
SELECT 
  id, tenant_id, name, preferences, client_since, created_at, updated_at
FROM public.clients;

-- View for clients with contact info (permission required)
CREATE OR REPLACE VIEW public.clients_with_contacts
WITH (security_invoker = true)
AS
SELECT id, tenant_id, name, email, phone, preferences, client_since, created_at, updated_at
FROM public.clients;

-- Product views for cost visibility control
CREATE OR REPLACE VIEW public.products_public
WITH (security_invoker = true)
AS
SELECT 
  id, tenant_id, brand, line, name, shade, type, stock, 
  reorder_level, target_stock, size, size_unit, is_active, created_at, updated_at
FROM public.products;

CREATE OR REPLACE VIEW public.products_with_costs
WITH (security_invoker = true)
AS
SELECT * FROM public.products;

-- Grant access to views
GRANT SELECT ON public.clients_basic TO authenticated;
GRANT SELECT ON public.clients_with_contacts TO authenticated;
GRANT SELECT ON public.products_public TO authenticated;
GRANT SELECT ON public.products_with_costs TO authenticated;