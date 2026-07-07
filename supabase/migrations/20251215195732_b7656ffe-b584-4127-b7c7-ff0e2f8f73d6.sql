-- Add can_view_own_commission column to staff table
ALTER TABLE public.staff ADD COLUMN can_view_own_commission BOOLEAN NOT NULL DEFAULT true;