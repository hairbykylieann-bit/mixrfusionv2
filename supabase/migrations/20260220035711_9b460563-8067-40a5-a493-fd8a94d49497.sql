
-- Create service_menu table
CREATE TABLE public.service_menu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  color_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  color_unit TEXT NOT NULL DEFAULT 'oz',
  developer_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  developer_unit TEXT NOT NULL DEFAULT 'oz',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Enable RLS
ALTER TABLE public.service_menu ENABLE ROW LEVEL SECURITY;

-- SELECT: tenant users + platform admins
CREATE POLICY "Tenant users can view service menu"
  ON public.service_menu
  FOR SELECT
  USING (tenant_id = get_user_tenant_id() OR is_platform_admin());

-- ALL (manage): settings managers only
CREATE POLICY "Settings managers can manage service menu"
  ON public.service_menu
  FOR ALL
  USING (tenant_id = get_user_tenant_id() AND current_staff_has_permission('can_manage_settings'));

-- Auto-update updated_at
CREATE TRIGGER update_service_menu_updated_at
  BEFORE UPDATE ON public.service_menu
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
