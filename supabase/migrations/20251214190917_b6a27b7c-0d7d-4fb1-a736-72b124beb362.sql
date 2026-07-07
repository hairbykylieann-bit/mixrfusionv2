-- Create client_staff_relationships table to track which staff have worked with/imported which clients
CREATE TABLE public.client_staff_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL DEFAULT 'worked_with', -- 'imported', 'worked_with', 'assigned'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, staff_id)
);

-- Enable RLS
ALTER TABLE public.client_staff_relationships ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view relationships"
ON public.client_staff_relationships
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create relationships"
ON public.client_staff_relationships
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins and owners can delete relationships"
ON public.client_staff_relationships
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

-- Create trigger to auto-create relationship when color_session is created
CREATE OR REPLACE FUNCTION public.create_staff_client_relationship()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create if stylist_id is set
  IF NEW.stylist_id IS NOT NULL THEN
    INSERT INTO public.client_staff_relationships (client_id, staff_id, relationship_type)
    VALUES (NEW.client_id, NEW.stylist_id, 'worked_with')
    ON CONFLICT (client_id, staff_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_color_session_create_relationship
AFTER INSERT ON public.color_sessions
FOR EACH ROW
EXECUTE FUNCTION public.create_staff_client_relationship();