-- Drop existing INSERT policy on salon-assets bucket
DROP POLICY IF EXISTS "Admins and owners can upload salon assets" ON storage.objects;

-- Create new INSERT policy that allows:
-- 1. Admin/owners to upload anywhere in the bucket
-- 2. Any authenticated user to upload to the logos/ folder (for onboarding)
CREATE POLICY "Allow salon asset uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'salon-assets' AND (
    -- Admins and owners can upload anywhere
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'owner'::app_role) OR
    -- Any authenticated user can upload to logos/ folder during onboarding
    (storage.foldername(name))[1] = 'logos'
  )
);