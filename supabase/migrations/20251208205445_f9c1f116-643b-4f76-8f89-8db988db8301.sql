-- Add product cost visibility permission
ALTER TABLE public.staff 
ADD COLUMN can_view_product_costs boolean NOT NULL DEFAULT false;

-- Give owners and admins cost visibility by default (based on existing role)
UPDATE public.staff 
SET can_view_product_costs = true 
WHERE role IN ('owner', 'admin');