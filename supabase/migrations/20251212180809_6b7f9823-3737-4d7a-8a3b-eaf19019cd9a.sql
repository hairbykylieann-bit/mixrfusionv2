-- Add individual markup override columns to staff table
ALTER TABLE public.staff 
ADD COLUMN has_custom_markup boolean NOT NULL DEFAULT false,
ADD COLUMN custom_markup_percent numeric NOT NULL DEFAULT 0;