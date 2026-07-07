-- Add salon setting for stylist cost visibility
ALTER TABLE public.salon_settings 
ADD COLUMN IF NOT EXISTS stylists_see_product_costs boolean NOT NULL DEFAULT false;