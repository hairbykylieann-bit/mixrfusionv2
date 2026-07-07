-- Create salon_settings table for configurable charges
CREATE TABLE public.salon_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  markup_percent numeric NOT NULL DEFAULT 35,
  bowl_fee numeric NOT NULL DEFAULT 2.50,
  waste_factor_percent numeric NOT NULL DEFAULT 5,
  rounding_amount numeric NOT NULL DEFAULT 0.25,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.salon_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view settings
CREATE POLICY "Authenticated users can view salon settings"
ON public.salon_settings
FOR SELECT
TO authenticated
USING (true);

-- Only admins and owners can update settings
CREATE POLICY "Admins and owners can update salon settings"
ON public.salon_settings
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

-- Only admins and owners can insert settings
CREATE POLICY "Admins and owners can insert salon settings"
ON public.salon_settings
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_salon_settings_updated_at
BEFORE UPDATE ON public.salon_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings row
INSERT INTO public.salon_settings (markup_percent, bowl_fee, waste_factor_percent, rounding_amount)
VALUES (35, 2.50, 5, 0.25);