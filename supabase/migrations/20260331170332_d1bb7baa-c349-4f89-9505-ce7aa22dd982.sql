
CREATE OR REPLACE FUNCTION public.adjust_product_stock(p_product_id uuid, p_delta numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_stock numeric;
BEGIN
  UPDATE public.products
  SET stock = GREATEST(0, stock + p_delta),
      updated_at = now()
  WHERE id = p_product_id
  RETURNING stock INTO v_new_stock;
  
  RETURN v_new_stock;
END;
$$;
