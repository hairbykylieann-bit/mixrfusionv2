-- Create helper function to check if current staff can view a specific client
CREATE OR REPLACE FUNCTION public.current_staff_can_view_client(client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Platform admins can view all
    is_platform_admin()
    OR
    -- Staff with can_view_all_clients permission
    current_staff_has_permission('can_view_all_clients')
    OR
    -- Staff who have a relationship with this client
    EXISTS (
      SELECT 1 FROM public.client_staff_relationships csr
      JOIN public.staff s ON s.id = csr.staff_id
      WHERE csr.client_id = current_staff_can_view_client.client_id
        AND s.user_id = auth.uid()
        AND s.tenant_id = get_user_tenant_id()
    )
    OR
    -- Staff who have sessions with this client
    EXISTS (
      SELECT 1 FROM public.color_sessions cs
      JOIN public.staff s ON s.id = cs.stylist_id
      WHERE cs.client_id = current_staff_can_view_client.client_id
        AND s.user_id = auth.uid()
        AND s.tenant_id = get_user_tenant_id()
    )
$$;

-- Drop existing policy
DROP POLICY IF EXISTS "Tenant users can view their clients" ON public.clients;

-- Create new policy with proper permission enforcement
CREATE POLICY "Staff can view permitted clients"
  ON public.clients FOR SELECT
  USING (
    tenant_id = get_user_tenant_id()
    AND current_staff_can_view_client(id)
  );