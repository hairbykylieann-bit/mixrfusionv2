-- Add client field requirement settings
ALTER TABLE public.salon_settings 
ADD COLUMN require_client_email boolean NOT NULL DEFAULT false,
ADD COLUMN require_client_phone boolean NOT NULL DEFAULT false;