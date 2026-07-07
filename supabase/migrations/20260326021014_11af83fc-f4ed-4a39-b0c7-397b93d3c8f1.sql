ALTER TABLE public.stock_adjustments
  ALTER COLUMN previous_stock TYPE numeric(10,2),
  ALTER COLUMN new_stock TYPE numeric(10,2),
  ALTER COLUMN change_amount TYPE numeric(10,2);