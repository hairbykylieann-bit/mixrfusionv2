-- Create notifications table for low stock alerts
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('low_stock', 'out_of_stock', 'reorder_reminder')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Tenant users can view their notifications"
  ON public.notifications
  FOR SELECT
  USING (tenant_id = get_user_tenant_id() OR is_platform_admin());

CREATE POLICY "Tenant users can update their notifications"
  ON public.notifications
  FOR UPDATE
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "System can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id() OR is_platform_admin());

CREATE POLICY "Tenant users can delete their notifications"
  ON public.notifications
  FOR DELETE
  USING (tenant_id = get_user_tenant_id());

-- Trigger function for low stock notifications
CREATE OR REPLACE FUNCTION public.notify_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when stock drops to or below reorder level
  -- and it wasn't already at or below that level
  IF NEW.stock <= NEW.reorder_level AND 
     (OLD.stock IS NULL OR OLD.stock > OLD.reorder_level) THEN
    INSERT INTO public.notifications (tenant_id, type, title, message, product_id)
    VALUES (
      NEW.tenant_id,
      CASE WHEN NEW.stock = 0 THEN 'out_of_stock' ELSE 'low_stock' END,
      CASE WHEN NEW.stock = 0 
        THEN NEW.name || ' is out of stock'
        ELSE NEW.name || ' is running low'
      END,
      'Current stock: ' || NEW.stock || '. Reorder level: ' || NEW.reorder_level,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on products table
CREATE TRIGGER product_stock_notification
  AFTER UPDATE OF stock ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_low_stock();

-- Also trigger on insert if product is added with low stock
CREATE OR REPLACE FUNCTION public.notify_low_stock_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock <= NEW.reorder_level THEN
    INSERT INTO public.notifications (tenant_id, type, title, message, product_id)
    VALUES (
      NEW.tenant_id,
      CASE WHEN NEW.stock = 0 THEN 'out_of_stock' ELSE 'low_stock' END,
      CASE WHEN NEW.stock = 0 
        THEN NEW.name || ' is out of stock'
        ELSE NEW.name || ' is running low'
      END,
      'Current stock: ' || NEW.stock || '. Reorder level: ' || NEW.reorder_level,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER product_stock_notification_insert
  AFTER INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_low_stock_on_insert();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;