-- Step 1: Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Tenant users can view their staff" ON public.staff;

-- Step 2: Create a restricted SELECT policy - only admins/owners can view full staff table
CREATE POLICY "Tenant admins can view staff details"
ON public.staff
FOR SELECT
USING (
  ((tenant_id = get_user_tenant_id()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role)))
  OR is_platform_admin()
);

-- Step 3: Create a policy for users to view their own staff record
CREATE POLICY "Staff can view own record"
ON public.staff
FOR SELECT
USING (
  user_id = auth.uid() AND tenant_id = get_user_tenant_id()
);

-- Step 4: Create a secure view for non-sensitive staff data (for regular tenant users)
CREATE OR REPLACE VIEW public.staff_directory AS
SELECT 
  id,
  tenant_id,
  name,
  role,
  custom_role_name,
  is_active,
  created_at
FROM public.staff
WHERE is_active = true AND tenant_id = get_user_tenant_id();

-- Step 5: Grant access to the view for authenticated users
GRANT SELECT ON public.staff_directory TO authenticated;

-- Step 6: Add comment explaining the security model
COMMENT ON VIEW public.staff_directory IS 'Public-facing staff directory. Excludes sensitive fields like email, phone, pin_hash, and compensation details. Use this view for staff selection dropdowns and lists.';

-- Step 7: Create a policy for users with can_manage_staff permission to see contact info
-- This requires a helper function to check staff permissions
CREATE OR REPLACE FUNCTION public.current_user_can_manage_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff
    WHERE user_id = auth.uid()
      AND tenant_id = get_user_tenant_id()
      AND (can_manage_staff = true OR role IN ('admin', 'owner'))
  )
$$;

-- Step 8: Create a view with contact info for staff managers
CREATE OR REPLACE VIEW public.staff_with_contacts AS
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
  AND (
    -- Admins/owners see all
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'owner'::app_role)
    -- Users with can_manage_staff permission
    OR current_user_can_manage_staff()
    -- Users can see their own record
    OR user_id = auth.uid()
  );

-- Grant access to the view
GRANT SELECT ON public.staff_with_contacts TO authenticated;

COMMENT ON VIEW public.staff_with_contacts IS 'Staff view with contact info and permissions. Excludes pin_hash and compensation details. Only accessible to admins, owners, staff managers, or viewing own record.';