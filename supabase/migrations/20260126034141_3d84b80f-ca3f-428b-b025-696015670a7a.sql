-- Add notification preference columns to salon_settings
ALTER TABLE public.salon_settings 
ADD COLUMN IF NOT EXISTS notify_low_stock boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_weekly_reports boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_waste_warnings boolean DEFAULT false;