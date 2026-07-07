
-- Drop the overly broad ALL policy
DROP POLICY IF EXISTS "Staff managers can manage tenant invitations" ON public.staff_invitations;

-- Staff managers can view invitations for their tenant
CREATE POLICY "Staff managers can view tenant invitations"
ON public.staff_invitations
FOR SELECT
USING (
  (tenant_id = get_user_tenant_id() AND current_user_can_manage_staff())
  OR is_platform_admin()
);

-- Staff managers can create invitations for their tenant
CREATE POLICY "Staff managers can create tenant invitations"
ON public.staff_invitations
FOR INSERT
WITH CHECK (
  tenant_id = get_user_tenant_id() AND current_user_can_manage_staff()
);

-- Staff managers can update invitations for their tenant
CREATE POLICY "Staff managers can update tenant invitations"
ON public.staff_invitations
FOR UPDATE
USING (
  tenant_id = get_user_tenant_id() AND current_user_can_manage_staff()
);

-- Staff managers can delete invitations for their tenant  
CREATE POLICY "Staff managers can delete tenant invitations"
ON public.staff_invitations
FOR DELETE
USING (
  tenant_id = get_user_tenant_id() AND current_user_can_manage_staff()
);
