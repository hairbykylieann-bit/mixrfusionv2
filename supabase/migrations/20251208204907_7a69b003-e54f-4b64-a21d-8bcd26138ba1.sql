-- Add refined client access columns
ALTER TABLE public.staff 
ADD COLUMN can_view_all_clients boolean NOT NULL DEFAULT true,
ADD COLUMN can_manage_own_clients boolean NOT NULL DEFAULT false;

-- Migrate existing data: if they had can_manage_clients, give them manage own as well
UPDATE public.staff 
SET can_manage_own_clients = true 
WHERE can_manage_clients = true;