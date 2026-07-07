
CREATE TABLE public.salon_bowls (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  photo_url text,
  tare_weight numeric NOT NULL DEFAULT 0,
  tare_unit text NOT NULL DEFAULT 'g',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.salon_bowls TO authenticated;
GRANT ALL ON public.salon_bowls TO service_role;

ALTER TABLE public.salon_bowls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view salon bowls"
  ON public.salon_bowls FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR public.is_platform_admin());

CREATE POLICY "Staff with manage settings can insert salon bowls"
  ON public.salon_bowls FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.current_staff_has_permission('can_manage_settings'));

CREATE POLICY "Staff with manage settings can update salon bowls"
  ON public.salon_bowls FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND public.current_staff_has_permission('can_manage_settings'))
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.current_staff_has_permission('can_manage_settings'));

CREATE POLICY "Staff with manage settings can delete salon bowls"
  ON public.salon_bowls FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id() AND public.current_staff_has_permission('can_manage_settings'));

CREATE TRIGGER update_salon_bowls_updated_at
  BEFORE UPDATE ON public.salon_bowls
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.session_bowls
  ADD COLUMN bowl_preset_id uuid REFERENCES public.salon_bowls(id) ON DELETE SET NULL,
  ADD COLUMN bowl_tare_weight numeric,
  ADD COLUMN bowl_tare_unit text,
  ADD COLUMN reweighed_amount numeric,
  ADD COLUMN reweighed_unit text;
