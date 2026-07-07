-- Fix: Remove the policy that exposes pin_hash to all tenant users
DROP POLICY IF EXISTS "Tenant users can view active staff directory" ON public.staff;

-- Drop existing views to recreate them with SECURITY DEFINER
DROP VIEW IF EXISTS public.staff_directory;
DROP VIEW IF EXISTS public.staff_with_contacts;

-- Recreate staff_directory as SECURITY DEFINER view with tenant filtering
-- This provides safe access to basic staff info without exposing sensitive data
CREATE VIEW public.staff_directory
WITH (security_invoker = false)
AS
SELECT 
  id,
  tenant_id,
  name,
  role,
  custom_role_name,
  is_active,
  created_at
FROM public.staff
WHERE (tenant_id = get_user_tenant_id() AND is_active = true) 
   OR is_platform_admin();

-- Set owner and grant access
ALTER VIEW public.staff_directory OWNER TO postgres;
GRANT SELECT ON public.staff_directory TO authenticated;

-- Recreate staff_with_contacts as SECURITY DEFINER view
-- Includes contact info and permissions but excludes pin_hash and compensation
CREATE VIEW public.staff_with_contacts
WITH (security_invoker = false)
AS
SELECT 
  id,
  tenant_id,
  name,
  email,
  phone,
  role,
  custom_role_name,
  is_active,
  can_create_bowls,
  can_manage_clients,
  can_manage_own_clients,
  can_manage_products,
  can_manage_settings,
  can_manage_staff,
  can_view_all_clients,
  can_view_basic_client_info,
  can_view_product_costs,
  can_view_reports,
  can_view_own_commission,
  created_at,
  updated_at
FROM public.staff
WHERE tenant_id = get_user_tenant_id() 
   OR is_platform_admin();

-- Set owner and grant access
ALTER VIEW public.staff_with_contacts OWNER TO postgres;
GRANT SELECT ON public.staff_with_contacts TO authenticated;