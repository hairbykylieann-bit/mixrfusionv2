-- Remove overly permissive SELECT policy and replace with more restrictive one
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.staff_invitations;

-- Allow unauthenticated users to view invitations (needed for join page before auth)
-- This is intentionally permissive for SELECT only - actual validation happens in edge function
CREATE POLICY "Public can view invitations for acceptance flow"
  ON public.staff_invitations FOR SELECT
  TO anon, authenticated
  USING (status = 'pending' AND expires_at > now());