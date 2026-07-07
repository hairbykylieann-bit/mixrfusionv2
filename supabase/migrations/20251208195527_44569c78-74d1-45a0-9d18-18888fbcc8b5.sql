-- Expand app_role enum with new roles
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'front_desk';

-- Add PIN authentication and permission columns to staff table
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS pin_hash TEXT,
  ADD COLUMN IF NOT EXISTS custom_role_name TEXT,
  ADD COLUMN IF NOT EXISTS can_manage_staff BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS can_view_reports BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS can_manage_products BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS can_manage_settings BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS can_manage_clients BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS can_view_all_client_data BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS can_view_basic_client_info BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS can_create_bowls BOOLEAN NOT NULL DEFAULT TRUE;

-- Add kiosk mode and brand kit columns to salon_settings table
ALTER TABLE public.salon_settings
  ADD COLUMN IF NOT EXISTS kiosk_mode_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pin_timeout_minutes INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS stylists_see_all_clients BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS salon_name TEXT,
  ADD COLUMN IF NOT EXISTS salon_logo_url TEXT;

-- Create storage bucket for salon branding assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('salon-assets', 'salon-assets', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policy: Anyone can view salon assets
CREATE POLICY "Public can view salon assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'salon-assets');

-- RLS policy: Admins and owners can upload salon assets
CREATE POLICY "Admins and owners can upload salon assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'salon-assets' 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role))
);

-- RLS policy: Admins and owners can update salon assets
CREATE POLICY "Admins and owners can update salon assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'salon-assets' 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role))
);

-- RLS policy: Admins and owners can delete salon assets
CREATE POLICY "Admins and owners can delete salon assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'salon-assets' 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role))
);