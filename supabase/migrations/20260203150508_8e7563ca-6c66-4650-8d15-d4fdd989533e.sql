-- Add Toner and Additive to the product_type enum
ALTER TYPE public.product_type ADD VALUE IF NOT EXISTS 'Toner';
ALTER TYPE public.product_type ADD VALUE IF NOT EXISTS 'Additive';