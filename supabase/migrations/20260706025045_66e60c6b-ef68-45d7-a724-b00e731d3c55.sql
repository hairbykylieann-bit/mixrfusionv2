CREATE OR REPLACE FUNCTION public.calculate_bowl_item_cost()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  product_cost DECIMAL(10,4);
  product_size_unit TEXT;
  converted_amount DECIMAL(10,4);
  amount_ml DECIMAL(14,4);
BEGIN
  SELECT cost_per_unit, size_unit INTO product_cost, product_size_unit
  FROM public.products
  WHERE id = NEW.product_id;

  -- Fast path: same unit, no conversion
  IF NEW.unit = COALESCE(product_size_unit, 'g') OR product_size_unit IS NULL THEN
    converted_amount = NEW.amount;
  ELSE
    -- Canonicalize the bowl amount to ml
    amount_ml = CASE NEW.unit
      WHEN 'ml' THEN NEW.amount
      WHEN 'g'  THEN NEW.amount            -- ~1:1 for hair products
      WHEN 'oz' THEN NEW.amount * 29.5735
      WHEN 'L'  THEN NEW.amount * 1000
      WHEN 'l'  THEN NEW.amount * 1000
      WHEN 'gal' THEN NEW.amount * 3785.41
      ELSE NEW.amount
    END;

    -- Convert ml into the product's size_unit
    converted_amount = CASE product_size_unit
      WHEN 'ml' THEN amount_ml
      WHEN 'g'  THEN amount_ml
      WHEN 'oz' THEN amount_ml * 0.033814
      WHEN 'L'  THEN amount_ml / 1000
      WHEN 'l'  THEN amount_ml / 1000
      WHEN 'gal' THEN amount_ml / 3785.41
      ELSE NEW.amount
    END;
  END IF;

  NEW.cost = ROUND(COALESCE(product_cost, 0) * converted_amount, 2);
  RETURN NEW;
END;
$function$;