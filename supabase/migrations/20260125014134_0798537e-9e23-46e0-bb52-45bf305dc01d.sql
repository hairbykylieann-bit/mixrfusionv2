-- Product catalogs (brand/line metadata) - accessible to all authenticated users
CREATE TABLE public.product_catalogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL,
  line TEXT NOT NULL,
  description TEXT,
  product_count INTEGER DEFAULT 0,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(brand, line)
);

-- Catalog products (pre-populated product data, not tenant-specific)
CREATE TABLE public.catalog_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id UUID REFERENCES public.product_catalogs(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('color', 'developer', 'lightener', 'treatment', 'toner', 'additive')),
  shade TEXT,
  name TEXT NOT NULL,
  default_size NUMERIC,
  default_size_unit TEXT DEFAULT 'ml',
  suggested_cost_per_unit NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_catalogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_products ENABLE ROW LEVEL SECURITY;

-- Policies for product_catalogs - anyone authenticated can view active catalogs
CREATE POLICY "Authenticated users can view active catalogs"
  ON public.product_catalogs
  FOR SELECT
  USING (is_active = true AND auth.uid() IS NOT NULL);

CREATE POLICY "Platform admins can manage catalogs"
  ON public.product_catalogs
  FOR ALL
  USING (is_platform_admin());

-- Policies for catalog_products - anyone authenticated can view
CREATE POLICY "Authenticated users can view catalog products"
  ON public.catalog_products
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Platform admins can manage catalog products"
  ON public.catalog_products
  FOR ALL
  USING (is_platform_admin());

-- Function to update product count on catalog
CREATE OR REPLACE FUNCTION public.update_catalog_product_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.product_catalogs 
    SET product_count = product_count + 1 
    WHERE id = NEW.catalog_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.product_catalogs 
    SET product_count = product_count - 1 
    WHERE id = OLD.catalog_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_catalog_count
  AFTER INSERT OR DELETE ON public.catalog_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_catalog_product_count();