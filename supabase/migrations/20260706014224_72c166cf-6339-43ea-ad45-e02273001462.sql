
CREATE TABLE public.service_menu_components (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.service_menu(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  product_type TEXT NOT NULL CHECK (product_type IN ('color','lightener','toner')),
  product_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  product_unit TEXT NOT NULL DEFAULT 'oz',
  developer_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  developer_unit TEXT NOT NULL DEFAULT 'oz',
  developer_ratio NUMERIC(6,3),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_service_menu_components_service ON public.service_menu_components(service_id);
CREATE INDEX idx_service_menu_components_tenant ON public.service_menu_components(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_menu_components TO authenticated;
GRANT ALL ON public.service_menu_components TO service_role;

ALTER TABLE public.service_menu_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view components in their tenant"
  ON public.service_menu_components FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR public.is_platform_admin());

CREATE POLICY "Settings managers can insert components"
  ON public.service_menu_components FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.current_staff_has_permission('can_manage_settings'));

CREATE POLICY "Settings managers can update components"
  ON public.service_menu_components FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND public.current_staff_has_permission('can_manage_settings'));

CREATE POLICY "Settings managers can delete components"
  ON public.service_menu_components FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND public.current_staff_has_permission('can_manage_settings'));

CREATE TRIGGER update_service_menu_components_updated_at
  BEFORE UPDATE ON public.service_menu_components
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill: one component per existing service
INSERT INTO public.service_menu_components (service_id, tenant_id, product_type, product_amount, product_unit, developer_amount, developer_unit, sort_order)
SELECT
  s.id,
  s.tenant_id,
  COALESCE(NULLIF(s.product_type, ''), 'color'),
  COALESCE(s.color_amount, 0),
  COALESCE(NULLIF(s.color_unit, ''), 'oz'),
  COALESCE(s.developer_amount, 0),
  COALESCE(NULLIF(s.developer_unit, ''), 'oz'),
  0
FROM public.service_menu s;
