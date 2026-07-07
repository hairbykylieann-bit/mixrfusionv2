-- Drop the can_view_all_client_data column from staff table
ALTER TABLE public.staff DROP COLUMN IF EXISTS can_view_all_client_data;