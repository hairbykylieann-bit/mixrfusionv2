-- Add commission structure fields to staff table
ALTER TABLE public.staff 
ADD COLUMN receives_commission boolean NOT NULL DEFAULT false,
ADD COLUMN commission_percent numeric NOT NULL DEFAULT 0;