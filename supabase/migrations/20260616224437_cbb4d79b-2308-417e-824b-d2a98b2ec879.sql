
DROP POLICY IF EXISTS "Admins and owners can upload salon assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins and owners can update salon assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins and owners can delete salon assets" ON storage.objects;

CREATE POLICY "Admins and owners can upload salon assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'salon-assets'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role))
  AND (
    (storage.foldername(name))[1] = get_user_tenant_id()::text
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

CREATE POLICY "Admins and owners can update salon assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'salon-assets'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role))
  AND (
    (storage.foldername(name))[1] = get_user_tenant_id()::text
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
)
WITH CHECK (
  bucket_id = 'salon-assets'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role))
  AND (
    (storage.foldername(name))[1] = get_user_tenant_id()::text
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

CREATE POLICY "Admins and owners can delete salon assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'salon-assets'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role))
  AND (
    (storage.foldername(name))[1] = get_user_tenant_id()::text
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);
