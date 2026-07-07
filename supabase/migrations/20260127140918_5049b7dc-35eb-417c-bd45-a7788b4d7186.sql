-- Create trigger to keep product_count in sync
CREATE OR REPLACE FUNCTION public.update_catalog_product_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE product_catalogs 
    SET product_count = COALESCE(product_count, 0) + 1 
    WHERE id = NEW.catalog_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE product_catalogs 
    SET product_count = GREATEST(COALESCE(product_count, 0) - 1, 0)
    WHERE id = OLD.catalog_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on catalog_products table
DROP TRIGGER IF EXISTS on_catalog_product_change ON catalog_products;
CREATE TRIGGER on_catalog_product_change
AFTER INSERT OR DELETE ON catalog_products
FOR EACH ROW EXECUTE FUNCTION update_catalog_product_count();