-- Add policy for platform admins to view all clients
CREATE POLICY "Platform admins can view all clients" 
ON public.clients 
FOR SELECT 
USING (is_platform_admin());