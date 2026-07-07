-- Prevent any deletion of staff records to preserve history
CREATE POLICY "No one can delete staff" ON public.staff
  FOR DELETE USING (false);