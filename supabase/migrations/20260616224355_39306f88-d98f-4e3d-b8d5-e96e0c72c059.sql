
-- 1) Tighten audit_logs INSERT policy
DROP POLICY IF EXISTS "Users can create audit logs for their tenant" ON public.audit_logs;
CREATE POLICY "Users can create audit logs for their tenant"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  actor_user_id = auth.uid()
  AND actor_type = 'tenant_user'::actor_type
  AND tenant_id IS NOT NULL
  AND tenant_id = get_user_tenant_id()
);

-- 2) Enforce tenant-prefix isolation on salon-assets storage objects
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
  AND (storage.foldername(name))[1] = get_user_tenant_id()::text
);

CREATE POLICY "Admins and owners can update salon assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'salon-assets'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role))
  AND (storage.foldername(name))[1] = get_user_tenant_id()::text
)
WITH CHECK (
  bucket_id = 'salon-assets'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role))
  AND (storage.foldername(name))[1] = get_user_tenant_id()::text
);

CREATE POLICY "Admins and owners can delete salon assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'salon-assets'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role))
  AND (storage.foldername(name))[1] = get_user_tenant_id()::text
);

-- 3) Realtime channel authorization: scope subscriptions to caller's tenant via topic prefix `tenant:<uuid>:...`
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant scoped realtime read" ON realtime.messages;
CREATE POLICY "Tenant scoped realtime read"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  split_part(realtime.topic(), ':', 1) = 'tenant'
  AND split_part(realtime.topic(), ':', 2) = get_user_tenant_id()::text
);

DROP POLICY IF EXISTS "Tenant scoped realtime write" ON realtime.messages;
CREATE POLICY "Tenant scoped realtime write"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  split_part(realtime.topic(), ':', 1) = 'tenant'
  AND split_part(realtime.topic(), ':', 2) = get_user_tenant_id()::text
);
