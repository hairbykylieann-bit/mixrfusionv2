
-- 1. Switch staff views to SECURITY INVOKER so RLS on underlying tables applies
ALTER VIEW public.staff_directory SET (security_invoker = true);
ALTER VIEW public.staff_with_contacts SET (security_invoker = true);

-- 2. Remove logos-folder bypass in storage INSERT policy
DROP POLICY IF EXISTS "Allow salon asset uploads" ON storage.objects;
CREATE POLICY "Admins and owners can upload salon assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'salon-assets'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'owner'::app_role)
  )
);

-- 3. Restrict tenant_users SELECT to user's own row (platform admins keep full access)
DROP POLICY IF EXISTS "Users can view their tenant membership" ON public.tenant_users;
CREATE POLICY "Users can view their own tenant membership"
ON public.tenant_users
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR is_platform_admin());
