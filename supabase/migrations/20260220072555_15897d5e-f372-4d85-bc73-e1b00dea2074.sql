
CREATE OR REPLACE FUNCTION public.calculate_bowl_item_cost()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  product_cost DECIMAL(10,4);
  product_size_unit TEXT;
  converted_amount DECIMAL(10,4);
BEGIN
  -- Get cost_per_unit and size_unit from the product
  SELECT cost_per_unit, size_unit INTO product_cost, product_size_unit
  FROM public.products
  WHERE id = NEW.product_id;

  -- Convert the bowl item amount from its unit to the product's size_unit
  IF NEW.unit = COALESCE(product_size_unit, 'g') OR product_size_unit IS NULL THEN
    -- Same unit, no conversion needed
    converted_amount = NEW.amount;
  ELSIF NEW.unit = 'oz' AND product_size_unit = 'ml' THEN
    converted_amount = NEW.amount * 29.5735;
  ELSIF NEW.unit = 'oz' AND product_size_unit = 'g' THEN
    converted_amount = NEW.amount * 28.3495;
  ELSIF NEW.unit = 'ml' AND product_size_unit = 'oz' THEN
    converted_amount = NEW.amount * 0.033814;
  ELSIF NEW.unit = 'ml' AND product_size_unit = 'g' THEN
    -- ml to g (assuming ~1:1 for most hair products)
    converted_amount = NEW.amount;
  ELSIF NEW.unit = 'g' AND product_size_unit = 'oz' THEN
    converted_amount = NEW.amount * 0.035274;
  ELSIF NEW.unit = 'g' AND product_size_unit = 'ml' THEN
    -- g to ml (assuming ~1:1 for most hair products)
    converted_amount = NEW.amount;
  ELSE
    -- Fallback: no conversion
    converted_amount = NEW.amount;
  END IF;

  NEW.cost = ROUND(COALESCE(product_cost, 0) * converted_amount, 2);
  RETURN NEW;
END;
$function$;
