
DROP VIEW IF EXISTS public.staff_self;
DROP VIEW IF EXISTS public.staff_directory;

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
  can_edit_formulas boolean
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
    s.can_view_product_costs, s.can_view_own_commission, s.can_edit_formulas
  FROM public.staff s
  WHERE s.user_id = auth.uid()
    AND s.tenant_id = get_user_tenant_id()
  LIMIT 1;
$$;

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
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id, s.user_id, s.tenant_id, s.name, s.email, s.phone,
    s.role, s.custom_role_name, s.is_active, s.invitation_status,
    s.created_at, s.updated_at
  FROM public.staff s
  WHERE s.tenant_id = get_user_tenant_id();
$$;

REVOKE EXECUTE ON FUNCTION public.get_current_staff_self() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.list_tenant_staff_directory() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_staff_self() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_tenant_staff_directory() TO authenticated;
