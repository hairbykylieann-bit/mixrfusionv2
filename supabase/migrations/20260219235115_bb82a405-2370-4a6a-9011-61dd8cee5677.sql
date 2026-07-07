
-- Create table for preferred developer line mappings
CREATE TABLE public.line_developer_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  brand TEXT NOT NULL,
  line TEXT NOT NULL,
  developer_brand TEXT NOT NULL,
  developer_line TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, brand, line)
);

-- Enable RLS
ALTER TABLE public.line_developer_defaults ENABLE ROW LEVEL SECURITY;

-- Tenant users can view their defaults
CREATE POLICY "Tenant users can view developer defaults"
ON public.line_developer_defaults
FOR SELECT
USING (tenant_id = get_user_tenant_id() OR is_platform_admin());

-- Tenant users with settings permission can manage defaults
CREATE POLICY "Settings managers can manage developer defaults"
ON public.line_developer_defaults
FOR ALL
USING (tenant_id = get_user_tenant_id() AND current_staff_has_permission('can_manage_settings'));

-- Trigger for updated_at
CREATE TRIGGER update_line_developer_defaults_updated_at
BEFORE UPDATE ON public.line_developer_defaults
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
