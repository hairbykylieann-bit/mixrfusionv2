-- Add setup_completed_at column to track when user dismisses/completes the setup wizard
ALTER TABLE public.salon_settings 
ADD COLUMN setup_completed_at timestamp with time zone DEFAULT NULL;