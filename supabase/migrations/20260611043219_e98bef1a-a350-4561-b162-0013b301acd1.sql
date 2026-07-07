
-- Drop the overly broad SELECT policy that exposed pin_hash, commission_percent,
-- email and phone of every coworker to every authenticated tenant user.
DROP POLICY IF EXISTS "Tenant users can view basic staff info via views" ON public.staff;

-- Recreate the safe views as SECURITY DEFINER so non-admin staff can still read
-- the limited columns these views expose, without being able to SELECT the full
-- staff row directly.

DROP VIEW IF EXISTS public.staff_directory;
CREATE VIEW public.staff_directory
WITH (security_invoker = false) AS
SELECT
  id, tenant_id, name, role, custom_role_name, is_active, created_at
FROM public.staff
WHERE is_active = true
  AND tenant_id = public.get_user_tenant_id();

ALTER VIEW public.staff_directory OWNER TO postgres;
GRANT SELECT ON public.staff_directory TO authenticated;
COMMENT ON VIEW public.staff_directory IS
  'Tenant-scoped staff directory. Non-sensitive fields only (no pin_hash, commission, email, phone). SECURITY DEFINER + tenant filter inside view.';

DROP VIEW IF EXISTS public.staff_with_contacts;
CREATE VIEW public.staff_with_contacts
WITH (security_invoker = false) AS
SELECT
  s.id, s.tenant_id, s.name, s.email, s.phone, s.role, s.custom_role_name,
  s.is_active, s.can_create_bowls, s.can_manage_clients, s.can_manage_own_clients,
  s.can_manage_products, s.can_manage_settings, s.can_manage_staff,
  s.can_view_all_clients, s.can_view_basic_client_info, s.can_view_product_costs,
  s.can_view_reports, s.can_view_own_commission, s.created_at, s.updated_at
FROM public.staff s
WHERE s.tenant_id = public.get_user_tenant_id()
  AND (
    -- Admins, owners, and platform admins see everyone in the tenant
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'owner'::app_role)
    OR public.is_platform_admin()
    -- Staff managers see everyone in the tenant
    OR public.current_user_can_manage_staff()
    -- Otherwise only your own record
    OR s.user_id = auth.uid()
  );

ALTER VIEW public.staff_with_contacts OWNER TO postgres;
GRANT SELECT ON public.staff_with_contacts TO authenticated;
COMMENT ON VIEW public.staff_with_contacts IS
  'Staff contact info (email/phone) + permission flags. Excludes pin_hash and compensation. SECURITY DEFINER view restricted to admins, owners, staff managers, or self.';
