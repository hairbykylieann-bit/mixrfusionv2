
DROP VIEW IF EXISTS public.staff_self;
DROP VIEW IF EXISTS public.staff_directory;

DROP POLICY IF EXISTS "Users can view own staff record" ON public.staff;
DROP POLICY IF EXISTS "Admins and owners can view all tenant staff" ON public.staff;
DROP POLICY IF EXISTS "Tenant admins can manage staff" ON public.staff;

CREATE POLICY "Owners can view all tenant staff"
ON public.staff
FOR SELECT
TO authenticated
USING (
  is_platform_admin()
  OR (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'owner'::app_role))
);

CREATE POLICY "Owners can manage staff"
ON public.staff
FOR ALL
TO authenticated
USING (
  tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'owner'::app_role)
)
WITH CHECK (
  tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'owner'::app_role)
);

CREATE VIEW public.staff_self AS
SELECT
  s.id, s.user_id, s.tenant_id, s.name, s.email, s.phone,
  s.role, s.custom_role_name, s.is_active, s.invitation_status,
  s.created_at, s.updated_at,
  s.can_manage_staff, s.can_view_reports, s.can_manage_products,
  s.can_manage_settings, s.can_manage_clients, s.can_view_basic_client_info,
  s.can_create_bowls, s.can_view_all_clients, s.can_manage_own_clients,
  s.can_view_product_costs, s.can_view_own_commission, s.can_edit_formulas
FROM public.staff s
WHERE s.user_id = auth.uid()
  AND s.tenant_id = get_user_tenant_id();

CREATE VIEW public.staff_directory AS
SELECT
  s.id, s.user_id, s.tenant_id, s.name, s.email, s.phone,
  s.role, s.custom_role_name, s.is_active, s.invitation_status,
  s.created_at, s.updated_at
FROM public.staff s
WHERE s.tenant_id = get_user_tenant_id();

GRANT SELECT ON public.staff_self TO authenticated;
GRANT SELECT ON public.staff_directory TO authenticated;
