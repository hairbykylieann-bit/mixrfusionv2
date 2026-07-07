
-- Drop dependent triggers
DROP TRIGGER IF EXISTS product_stock_notification ON public.products;
DROP TRIGGER IF EXISTS product_stock_notification_insert ON public.products;

-- Drop dependent views
DROP VIEW IF EXISTS public.products_public;
DROP VIEW IF EXISTS public.products_with_costs;

-- Alter the column type
ALTER TABLE public.products ALTER COLUMN stock TYPE numeric(10,2);

-- Recreate views
CREATE VIEW public.products_public AS
SELECT id, tenant_id, brand, line, name, shade, type, stock, reorder_level, target_stock, size, size_unit, is_active, created_at, updated_at
FROM products;

CREATE VIEW public.products_with_costs AS
SELECT id, type, brand, line, shade, name, stock, reorder_level, target_stock, size, size_unit, cost_per_unit, is_active, created_at, updated_at, tenant_id
FROM products;

-- Recreate triggers
CREATE TRIGGER product_stock_notification
  AFTER UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_low_stock();

CREATE TRIGGER product_stock_notification_insert
  AFTER INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_low_stock_on_insert();
