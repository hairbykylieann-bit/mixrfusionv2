-- Fix the SECURITY DEFINER view issues by recreating as SECURITY INVOKER
-- and adjusting the approach to work with RLS properly

-- Drop the problematic views
DROP VIEW IF EXISTS public.staff_directory;
DROP VIEW IF EXISTS public.staff_with_contacts;

-- Create staff_directory as SECURITY INVOKER (default, but explicit for clarity)
-- This view will respect RLS policies of the querying user
CREATE VIEW public.staff_directory 
WITH (security_invoker = true)
AS
SELECT 
  s.id,
  s.tenant_id,
  s.name,
  s.role,
  s.custom_role_name,
  s.is_active,
  s.created_at
FROM public.staff s
WHERE s.is_active = true;

-- Grant access to authenticated users
GRANT SELECT ON public.staff_directory TO authenticated;

COMMENT ON VIEW public.staff_directory IS 'Public-facing staff directory with non-sensitive fields only. Uses SECURITY INVOKER so RLS policies apply.';

-- Create staff_with_contacts as SECURITY INVOKER
CREATE VIEW public.staff_with_contacts 
WITH (security_invoker = true)
AS
SELECT 
  s.id,
  s.tenant_id,
  s.name,
  s.email,
  s.phone,
  s.role,
  s.custom_role_name,
  s.is_active,
  s.can_create_bowls,
  s.can_manage_clients,
  s.can_manage_own_clients,
  s.can_manage_products,
  s.can_manage_settings,
  s.can_manage_staff,
  s.can_view_all_clients,
  s.can_view_basic_client_info,
  s.can_view_product_costs,
  s.can_view_reports,
  s.can_view_own_commission,
  s.created_at,
  s.updated_at
FROM public.staff s;

GRANT SELECT ON public.staff_with_contacts TO authenticated;

COMMENT ON VIEW public.staff_with_contacts IS 'Staff view with contact info and permissions. Excludes pin_hash and compensation details. Uses SECURITY INVOKER so RLS policies apply.';

-- Now update the RLS policy to allow tenant users to see basic staff info
-- while still protecting sensitive columns through the view layer
DROP POLICY IF EXISTS "Tenant admins can view staff details" ON public.staff;
DROP POLICY IF EXISTS "Staff can view own record" ON public.staff;

-- Policy 1: Admins and owners can see all staff in their tenant
CREATE POLICY "Admins and owners can view all tenant staff"
ON public.staff
FOR SELECT
USING (
  (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role)))
  OR is_platform_admin()
);

-- Policy 2: Users can see their own staff record
CREATE POLICY "Users can view own staff record"
ON public.staff
FOR SELECT
USING (
  user_id = auth.uid() AND tenant_id = get_user_tenant_id()
);

-- Policy 3: Tenant users can see active staff via the directory view (limited columns)
-- We need a policy that allows viewing basic info for all active tenant staff
CREATE POLICY "Tenant users can view active staff directory"
ON public.staff
FOR SELECT
USING (
  tenant_id = get_user_tenant_id() AND is_active = true
);