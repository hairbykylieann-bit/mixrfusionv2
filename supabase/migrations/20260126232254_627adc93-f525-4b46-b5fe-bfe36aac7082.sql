-- Issue 1: Fix Security Definer Views
-- Add SELECT policy for tenant users to access staff table
-- This allows the SECURITY INVOKER views to function properly
CREATE POLICY "Tenant users can view basic staff info via views"
ON public.staff FOR SELECT
TO authenticated
USING (tenant_id = get_user_tenant_id());

-- Recreate staff_directory with SECURITY INVOKER
DROP VIEW IF EXISTS public.staff_directory;
CREATE VIEW public.staff_directory
WITH (security_invoker = true)
AS
SELECT 
  id, tenant_id, name, role, custom_role_name, is_active, created_at
FROM public.staff
WHERE is_active = true;

-- Recreate staff_with_contacts with SECURITY INVOKER
DROP VIEW IF EXISTS public.staff_with_contacts;
CREATE VIEW public.staff_with_contacts
WITH (security_invoker = true)
AS
SELECT 
  id, tenant_id, name, email, phone, role, custom_role_name,
  is_active, can_create_bowls, can_manage_clients, can_manage_own_clients,
  can_manage_products, can_manage_settings, can_manage_staff,
  can_view_all_clients, can_view_basic_client_info, can_view_product_costs,
  can_view_reports, can_view_own_commission, created_at, updated_at
FROM public.staff;

-- Grant access to authenticated users
GRANT SELECT ON public.staff_directory TO authenticated;
GRANT SELECT ON public.staff_with_contacts TO authenticated;

-- Issue 2: Fix Audit Logs Policy
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can create audit logs" ON public.audit_logs;

-- Create constrained policy
CREATE POLICY "Users can create audit logs for their tenant"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (
  actor_user_id = auth.uid() 
  AND (tenant_id IS NULL OR tenant_id = get_user_tenant_id())
);

-- Issue 3: Fix Staff Invitations Policy
-- Remove public access - edge functions use service role
DROP POLICY IF EXISTS "Public can view invitations for acceptance flow" 
ON public.staff_invitations;