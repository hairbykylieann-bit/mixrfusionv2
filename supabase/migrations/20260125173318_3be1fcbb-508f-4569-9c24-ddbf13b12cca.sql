-- Create enum for stock adjustment reasons
CREATE TYPE stock_adjustment_reason AS ENUM (
  'received_order',
  'service_usage', 
  'manual_correction',
  'damaged',
  'returned',
  'initial_stock'
);

-- Create stock adjustments table
CREATE TABLE public.stock_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  change_amount INTEGER NOT NULL,
  reason stock_adjustment_reason NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;

-- Policy: Tenant users can view their stock adjustments
CREATE POLICY "Tenant users can view stock adjustments"
  ON public.stock_adjustments FOR SELECT
  USING (tenant_id = get_user_tenant_id() OR is_platform_admin());

-- Policy: Tenant users with can_manage_products can insert adjustments
CREATE POLICY "Tenant users can create stock adjustments"
  ON public.stock_adjustments FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());

-- Create index for faster queries
CREATE INDEX idx_stock_adjustments_product_id ON public.stock_adjustments(product_id);
CREATE INDEX idx_stock_adjustments_tenant_id ON public.stock_adjustments(tenant_id);
CREATE INDEX idx_stock_adjustments_created_at ON public.stock_adjustments(created_at DESC);