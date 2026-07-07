-- ============================================
-- Phase A: Fix Usage Analytics and Audit Logging
-- ============================================

-- 1. Add unique constraint to usage_daily to prevent duplicates
ALTER TABLE public.usage_daily 
ADD CONSTRAINT usage_daily_tenant_date_unique 
UNIQUE (tenant_id, date);

-- 2. Create function to increment usage_daily counters
CREATE OR REPLACE FUNCTION public.increment_usage_daily(
  p_tenant_id uuid,
  p_field_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usage_daily (tenant_id, date, bowls_count, color_sessions_count, clients_added_count, products_used_count)
  VALUES (
    p_tenant_id,
    CURRENT_DATE,
    CASE WHEN p_field_name = 'bowls_count' THEN 1 ELSE 0 END,
    CASE WHEN p_field_name = 'color_sessions_count' THEN 1 ELSE 0 END,
    CASE WHEN p_field_name = 'clients_added_count' THEN 1 ELSE 0 END,
    CASE WHEN p_field_name = 'products_used_count' THEN 1 ELSE 0 END
  )
  ON CONFLICT (tenant_id, date)
  DO UPDATE SET
    bowls_count = usage_daily.bowls_count + CASE WHEN p_field_name = 'bowls_count' THEN 1 ELSE 0 END,
    color_sessions_count = usage_daily.color_sessions_count + CASE WHEN p_field_name = 'color_sessions_count' THEN 1 ELSE 0 END,
    clients_added_count = usage_daily.clients_added_count + CASE WHEN p_field_name = 'clients_added_count' THEN 1 ELSE 0 END,
    products_used_count = usage_daily.products_used_count + CASE WHEN p_field_name = 'products_used_count' THEN 1 ELSE 0 END;
END;
$$;

-- 3. Create trigger function for color_sessions
CREATE OR REPLACE FUNCTION public.trigger_usage_color_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN
    PERFORM increment_usage_daily(NEW.tenant_id, 'color_sessions_count');
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Create trigger function for session_bowls
CREATE OR REPLACE FUNCTION public.trigger_usage_bowl()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN
    PERFORM increment_usage_daily(NEW.tenant_id, 'bowls_count');
  END IF;
  RETURN NEW;
END;
$$;

-- 5. Create trigger function for clients
CREATE OR REPLACE FUNCTION public.trigger_usage_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN
    PERFORM increment_usage_daily(NEW.tenant_id, 'clients_added_count');
  END IF;
  RETURN NEW;
END;
$$;

-- 6. Create trigger function for products usage (bowl_items)
CREATE OR REPLACE FUNCTION public.trigger_usage_product()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN
    PERFORM increment_usage_daily(NEW.tenant_id, 'products_used_count');
  END IF;
  RETURN NEW;
END;
$$;

-- 7. Attach triggers to tables
CREATE TRIGGER usage_track_color_session
  AFTER INSERT ON public.color_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_usage_color_session();

CREATE TRIGGER usage_track_bowl
  AFTER INSERT ON public.session_bowls
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_usage_bowl();

CREATE TRIGGER usage_track_client
  AFTER INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_usage_client();

CREATE TRIGGER usage_track_product
  AFTER INSERT ON public.bowl_items
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_usage_product();

-- 8. Add indexes for subscriptions (Stripe integration prep)
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id 
ON public.subscriptions (stripe_customer_id) 
WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id 
ON public.subscriptions (stripe_subscription_id) 
WHERE stripe_subscription_id IS NOT NULL;

-- 9. Create helper function for audit logging
CREATE OR REPLACE FUNCTION public.log_audit(
  p_action text,
  p_actor_type actor_type,
  p_actor_user_id uuid,
  p_tenant_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO public.audit_logs (action, actor_type, actor_user_id, tenant_id, metadata)
  VALUES (p_action, p_actor_type, p_actor_user_id, p_tenant_id, p_metadata)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;