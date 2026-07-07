-- Phase 1: Multi-Tenancy Foundation for MixR Fusion Platform Admin
-- First, fix the protect_owner_role function that references non-existent column

-- Drop and recreate the protect_owner_role function without the problematic column
CREATE OR REPLACE FUNCTION public.protect_owner_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role = 'owner' THEN
    IF NEW.role != 'owner' THEN
      RAISE EXCEPTION 'Owner role cannot be changed';
    END IF;
    
    IF NEW.is_active = false THEN
      RAISE EXCEPTION 'Owner accounts cannot be deactivated';
    END IF;
    
    NEW.can_create_bowls := true;
    NEW.can_view_basic_client_info := true;
    NEW.can_view_all_clients := true;
    NEW.can_manage_clients := true;
    NEW.can_manage_own_clients := true;
    NEW.can_manage_products := true;
    NEW.can_view_product_costs := true;
    NEW.can_view_reports := true;
    NEW.can_manage_staff := true;
    NEW.can_manage_settings := true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================
-- STEP 1: CREATE NEW ENUMS
-- ============================================

CREATE TYPE public.tenant_status AS ENUM ('active', 'suspended', 'archived');
CREATE TYPE public.subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled');
CREATE TYPE public.invoice_status AS ENUM ('draft', 'open', 'paid', 'void', 'uncollectible');
CREATE TYPE public.payment_status AS ENUM ('succeeded', 'failed', 'pending', 'refunded');
CREATE TYPE public.actor_type AS ENUM ('platform_admin', 'tenant_user');

-- ============================================
-- STEP 2: CREATE PLATFORM ADMINS TABLE
-- ============================================

CREATE TABLE public.platform_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view platform_admins"
  ON public.platform_admins FOR SELECT
  USING (user_id = auth.uid());

-- ============================================
-- STEP 3: CREATE TENANTS TABLE
-- ============================================

CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_user_id UUID REFERENCES auth.users(id),
  status public.tenant_status NOT NULL DEFAULT 'active',
  primary_contact_email TEXT,
  notes TEXT,
  created_by_platform_admin UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 4: CREATE TENANT USERS TABLE
-- ============================================

CREATE TABLE public.tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'stylist',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5: CREATE BILLING TABLES
-- ============================================

CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  seat_price_cents INTEGER NOT NULL DEFAULT 0,
  base_price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  features_json JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  stripe_price_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  plan_id UUID NOT NULL REFERENCES public.plans(id),
  status public.subscription_status NOT NULL DEFAULT 'trialing',
  seat_count INTEGER NOT NULL DEFAULT 1,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  subscription_id UUID REFERENCES public.subscriptions(id),
  provider TEXT NOT NULL DEFAULT 'manual',
  provider_invoice_id TEXT,
  amount_due_cents INTEGER NOT NULL DEFAULT 0,
  amount_paid_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  status public.invoice_status NOT NULL DEFAULT 'draft',
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  invoice_id UUID REFERENCES public.invoices(id),
  provider TEXT NOT NULL DEFAULT 'manual',
  provider_payment_id TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status public.payment_status NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 6: CREATE ANALYTICS & AUDIT TABLES
-- ============================================

CREATE TABLE public.usage_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  date DATE NOT NULL,
  color_sessions_count INTEGER NOT NULL DEFAULT 0,
  bowls_count INTEGER NOT NULL DEFAULT 0,
  clients_added_count INTEGER NOT NULL DEFAULT 0,
  products_used_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, date)
);

ALTER TABLE public.usage_daily ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.whitelabel_settings (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  app_name TEXT DEFAULT 'MixR Fusion',
  logo_url TEXT,
  primary_color TEXT DEFAULT '#8B5CF6',
  support_email TEXT,
  custom_domain TEXT,
  email_from_name TEXT,
  email_from_domain TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whitelabel_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL,
  actor_type public.actor_type NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 7: ADD TENANT_ID TO EXISTING TABLES
-- ============================================

ALTER TABLE public.clients ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.products ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.staff ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.color_sessions ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.session_bowls ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.bowl_items ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.client_staff_relationships ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.salon_settings ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);

-- ============================================
-- STEP 8: CREATE SECURITY HELPER FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.tenant_users
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.handle_platform_admin_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'brandedbeauty@gmail.com' THEN
    INSERT INTO public.platform_admins (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_platform_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_platform_admin_signup();

-- ============================================
-- STEP 9: CREATE DEMO TENANT & MIGRATE DATA
-- ============================================

INSERT INTO public.tenants (id, name, status, primary_contact_email)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'MixR Fusion Demo Salon',
  'active',
  'demo@mixrfusion.com'
);

UPDATE public.clients SET tenant_id = '11111111-1111-1111-1111-111111111111' WHERE tenant_id IS NULL;
UPDATE public.products SET tenant_id = '11111111-1111-1111-1111-111111111111' WHERE tenant_id IS NULL;
UPDATE public.staff SET tenant_id = '11111111-1111-1111-1111-111111111111' WHERE tenant_id IS NULL;
UPDATE public.color_sessions SET tenant_id = '11111111-1111-1111-1111-111111111111' WHERE tenant_id IS NULL;
UPDATE public.session_bowls SET tenant_id = '11111111-1111-1111-1111-111111111111' WHERE tenant_id IS NULL;
UPDATE public.bowl_items SET tenant_id = '11111111-1111-1111-1111-111111111111' WHERE tenant_id IS NULL;
UPDATE public.client_staff_relationships SET tenant_id = '11111111-1111-1111-1111-111111111111' WHERE tenant_id IS NULL;
UPDATE public.salon_settings SET tenant_id = '11111111-1111-1111-1111-111111111111' WHERE tenant_id IS NULL;

INSERT INTO public.plans (name, seat_price_cents, base_price_cents, features_json, is_active)
VALUES 
  ('Starter', 1500, 0, '{"max_staff": 3, "reports": false}', true),
  ('Pro', 2500, 2000, '{"max_staff": 10, "reports": true, "ai_assistant": true}', true),
  ('Enterprise', 2000, 10000, '{"max_staff": -1, "reports": true, "ai_assistant": true, "whitelabel": true}', true);

INSERT INTO public.subscriptions (tenant_id, plan_id, status, seat_count, trial_start, trial_end)
SELECT 
  '11111111-1111-1111-1111-111111111111',
  id,
  'trialing',
  6,
  now(),
  now() + interval '14 days'
FROM public.plans WHERE name = 'Pro';

INSERT INTO public.whitelabel_settings (tenant_id, app_name)
VALUES ('11111111-1111-1111-1111-111111111111', 'MixR Fusion Demo');

-- ============================================
-- STEP 10: RLS POLICIES FOR NEW TABLES
-- ============================================

CREATE POLICY "Tenant members can view their tenant"
  ON public.tenants FOR SELECT
  USING (id = public.get_user_tenant_id() OR public.is_platform_admin());

CREATE POLICY "Platform admins can manage tenants"
  ON public.tenants FOR ALL
  USING (public.is_platform_admin());

CREATE POLICY "Users can view their tenant membership"
  ON public.tenant_users FOR SELECT
  USING (user_id = auth.uid() OR tenant_id = public.get_user_tenant_id() OR public.is_platform_admin());

CREATE POLICY "Platform admins can manage tenant users"
  ON public.tenant_users FOR ALL
  USING (public.is_platform_admin());

CREATE POLICY "Anyone can view active plans"
  ON public.plans FOR SELECT
  USING (is_active = true OR public.is_platform_admin());

CREATE POLICY "Platform admins can manage plans"
  ON public.plans FOR ALL
  USING (public.is_platform_admin());

CREATE POLICY "Tenant members can view their subscription"
  ON public.subscriptions FOR SELECT
  USING (tenant_id = public.get_user_tenant_id() OR public.is_platform_admin());

CREATE POLICY "Platform admins can manage subscriptions"
  ON public.subscriptions FOR ALL
  USING (public.is_platform_admin());

CREATE POLICY "Tenant members can view their invoices"
  ON public.invoices FOR SELECT
  USING (tenant_id = public.get_user_tenant_id() OR public.is_platform_admin());

CREATE POLICY "Platform admins can manage invoices"
  ON public.invoices FOR ALL
  USING (public.is_platform_admin());

CREATE POLICY "Tenant members can view their payments"
  ON public.payments FOR SELECT
  USING (tenant_id = public.get_user_tenant_id() OR public.is_platform_admin());

CREATE POLICY "Platform admins can manage payments"
  ON public.payments FOR ALL
  USING (public.is_platform_admin());

CREATE POLICY "Tenant members can view their usage"
  ON public.usage_daily FOR SELECT
  USING (tenant_id = public.get_user_tenant_id() OR public.is_platform_admin());

CREATE POLICY "Platform admins can manage usage"
  ON public.usage_daily FOR ALL
  USING (public.is_platform_admin());

CREATE POLICY "Tenant members can view their whitelabel settings"
  ON public.whitelabel_settings FOR SELECT
  USING (tenant_id = public.get_user_tenant_id() OR public.is_platform_admin());

CREATE POLICY "Platform admins can manage whitelabel settings"
  ON public.whitelabel_settings FOR ALL
  USING (public.is_platform_admin());

CREATE POLICY "Platform admins can view all audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_platform_admin() OR (tenant_id = public.get_user_tenant_id() AND actor_type = 'tenant_user'));

CREATE POLICY "Anyone can create audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);

-- ============================================
-- STEP 11: UPDATE RLS FOR EXISTING TABLES
-- ============================================

DROP POLICY IF EXISTS "Anyone can view clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can create clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can update clients" ON public.clients;
DROP POLICY IF EXISTS "Admins and owners can delete clients" ON public.clients;

CREATE POLICY "Tenant users can view their clients"
  ON public.clients FOR SELECT
  USING (tenant_id = public.get_user_tenant_id() OR public.is_platform_admin());

CREATE POLICY "Tenant users can create clients"
  ON public.clients FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant users can update their clients"
  ON public.clients FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant admins can delete clients"
  ON public.clients FOR DELETE
  USING (tenant_id = public.get_user_tenant_id() AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'owner'::app_role)));

DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can manage products" ON public.products;

CREATE POLICY "Tenant users can view their products"
  ON public.products FOR SELECT
  USING (tenant_id = public.get_user_tenant_id() OR public.is_platform_admin());

CREATE POLICY "Tenant users can create products"
  ON public.products FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant users can update their products"
  ON public.products FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant admins can delete products"
  ON public.products FOR DELETE
  USING (tenant_id = public.get_user_tenant_id() AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'owner'::app_role)));

DROP POLICY IF EXISTS "Anyone can view active staff" ON public.staff;
DROP POLICY IF EXISTS "Admins and owners can manage staff" ON public.staff;
DROP POLICY IF EXISTS "No one can delete staff" ON public.staff;

CREATE POLICY "Tenant users can view their staff"
  ON public.staff FOR SELECT
  USING ((tenant_id = public.get_user_tenant_id() AND is_active = true) OR public.is_platform_admin());

CREATE POLICY "Tenant admins can manage staff"
  ON public.staff FOR ALL
  USING (tenant_id = public.get_user_tenant_id() AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'owner'::app_role)));

DROP POLICY IF EXISTS "Anyone can view sessions" ON public.color_sessions;
DROP POLICY IF EXISTS "Authenticated users can create sessions" ON public.color_sessions;
DROP POLICY IF EXISTS "Authenticated users can update sessions" ON public.color_sessions;
DROP POLICY IF EXISTS "Admins and owners can delete sessions" ON public.color_sessions;

CREATE POLICY "Tenant users can view their sessions"
  ON public.color_sessions FOR SELECT
  USING (tenant_id = public.get_user_tenant_id() OR public.is_platform_admin());

CREATE POLICY "Tenant users can create sessions"
  ON public.color_sessions FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant users can update their sessions"
  ON public.color_sessions FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant admins can delete sessions"
  ON public.color_sessions FOR DELETE
  USING (tenant_id = public.get_user_tenant_id() AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'owner'::app_role)));

DROP POLICY IF EXISTS "Anyone can view bowls" ON public.session_bowls;
DROP POLICY IF EXISTS "Authenticated users can manage bowls" ON public.session_bowls;

CREATE POLICY "Tenant users can view their bowls"
  ON public.session_bowls FOR SELECT
  USING (tenant_id = public.get_user_tenant_id() OR public.is_platform_admin());

CREATE POLICY "Tenant users can manage bowls"
  ON public.session_bowls FOR ALL
  USING (tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "Anyone can view bowl items" ON public.bowl_items;
DROP POLICY IF EXISTS "Authenticated users can manage bowl items" ON public.bowl_items;

CREATE POLICY "Tenant users can view their bowl items"
  ON public.bowl_items FOR SELECT
  USING (tenant_id = public.get_user_tenant_id() OR public.is_platform_admin());

CREATE POLICY "Tenant users can manage bowl items"
  ON public.bowl_items FOR ALL
  USING (tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "Anyone can view relationships" ON public.client_staff_relationships;
DROP POLICY IF EXISTS "Authenticated users can create relationships" ON public.client_staff_relationships;
DROP POLICY IF EXISTS "Admins and owners can delete relationships" ON public.client_staff_relationships;

CREATE POLICY "Tenant users can view their relationships"
  ON public.client_staff_relationships FOR SELECT
  USING (tenant_id = public.get_user_tenant_id() OR public.is_platform_admin());

CREATE POLICY "Tenant users can create relationships"
  ON public.client_staff_relationships FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant admins can delete relationships"
  ON public.client_staff_relationships FOR DELETE
  USING (tenant_id = public.get_user_tenant_id() AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'owner'::app_role)));

DROP POLICY IF EXISTS "Anyone can view salon settings" ON public.salon_settings;
DROP POLICY IF EXISTS "Admins and owners can update salon settings" ON public.salon_settings;
DROP POLICY IF EXISTS "Admins and owners can insert salon settings" ON public.salon_settings;

CREATE POLICY "Tenant users can view their salon settings"
  ON public.salon_settings FOR SELECT
  USING (tenant_id = public.get_user_tenant_id() OR public.is_platform_admin());

CREATE POLICY "Tenant admins can manage salon settings"
  ON public.salon_settings FOR ALL
  USING (tenant_id = public.get_user_tenant_id() AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'owner'::app_role)));

-- ============================================
-- STEP 12: CREATE INDEXES
-- ============================================

CREATE INDEX idx_clients_tenant_id ON public.clients(tenant_id);
CREATE INDEX idx_products_tenant_id ON public.products(tenant_id);
CREATE INDEX idx_staff_tenant_id ON public.staff(tenant_id);
CREATE INDEX idx_color_sessions_tenant_id ON public.color_sessions(tenant_id);
CREATE INDEX idx_session_bowls_tenant_id ON public.session_bowls(tenant_id);
CREATE INDEX idx_bowl_items_tenant_id ON public.bowl_items(tenant_id);
CREATE INDEX idx_tenant_users_user_id ON public.tenant_users(user_id);
CREATE INDEX idx_tenant_users_tenant_id ON public.tenant_users(tenant_id);
CREATE INDEX idx_subscriptions_tenant_id ON public.subscriptions(tenant_id);
CREATE INDEX idx_invoices_tenant_id ON public.invoices(tenant_id);
CREATE INDEX idx_payments_tenant_id ON public.payments(tenant_id);
CREATE INDEX idx_usage_daily_tenant_date ON public.usage_daily(tenant_id, date);
CREATE INDEX idx_audit_logs_tenant_id ON public.audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_actor ON public.audit_logs(actor_user_id);