-- ⚠️ STALE — DO NOT TRUST (marked 2026-07-06).
-- This snapshot predates many migrations (integer stock, buggy triggers, no
-- permissions hardening). The REAL schema = supabase/migrations/ applied in order.

-- =====================================================
-- MixR Fusion - Complete Database Schema
-- Run this in your Supabase SQL Editor
-- =====================================================
-- 
-- INSTRUCTIONS:
-- 1. Create a new Supabase project at supabase.com
-- 2. Go to SQL Editor in your Supabase dashboard
-- 3. Copy and paste this entire file
-- 4. Click "Run" to execute
-- 5. After running, enable Email Auth in Authentication settings
-- 6. Set "Confirm email" to OFF for development
--
-- =====================================================

-- =====================================================
-- PART 1: ENUMS
-- =====================================================

CREATE TYPE public.product_type AS ENUM ('Color', 'Developer', 'Lightener', 'Treatment');
CREATE TYPE public.app_role AS ENUM ('admin', 'owner', 'stylist', 'assistant', 'manager', 'front_desk');
CREATE TYPE public.tenant_status AS ENUM ('active', 'suspended', 'archived');
CREATE TYPE public.subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled');
CREATE TYPE public.invoice_status AS ENUM ('draft', 'open', 'paid', 'void', 'uncollectible');
CREATE TYPE public.payment_status AS ENUM ('succeeded', 'failed', 'pending', 'refunded');
CREATE TYPE public.actor_type AS ENUM ('platform_admin', 'tenant_user');

-- =====================================================
-- PART 2: TABLES
-- =====================================================

-- Profiles (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Platform Admins (super admins)
CREATE TABLE public.platform_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tenants (Salons)
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status public.tenant_status NOT NULL DEFAULT 'active',
  owner_user_id UUID REFERENCES auth.users(id),
  primary_contact_email TEXT,
  notes TEXT,
  created_by_platform_admin UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tenant Users (maps users to tenants)
CREATE TABLE public.tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'stylist',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);

-- Salon Settings
CREATE TABLE public.salon_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  salon_name TEXT,
  salon_logo_url TEXT,
  markup_percent NUMERIC NOT NULL DEFAULT 35,
  bowl_fee NUMERIC NOT NULL DEFAULT 2.50,
  waste_factor_percent NUMERIC NOT NULL DEFAULT 5,
  rounding_amount NUMERIC NOT NULL DEFAULT 0.25,
  require_client_email BOOLEAN NOT NULL DEFAULT false,
  require_client_phone BOOLEAN NOT NULL DEFAULT false,
  kiosk_mode_enabled BOOLEAN NOT NULL DEFAULT false,
  pin_timeout_minutes INTEGER NOT NULL DEFAULT 2,
  stylists_see_all_clients BOOLEAN NOT NULL DEFAULT true,
  setup_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Plans (Subscription Plans)
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  base_price_cents INTEGER NOT NULL DEFAULT 0,
  seat_price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  features_json JSONB DEFAULT '{}'::jsonb,
  stripe_price_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Subscriptions
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id),
  status public.subscription_status NOT NULL DEFAULT 'trialing',
  seat_count INTEGER NOT NULL DEFAULT 1,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Invoices
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id),
  amount_due_cents INTEGER NOT NULL DEFAULT 0,
  amount_paid_cents INTEGER NOT NULL DEFAULT 0,
  status public.invoice_status NOT NULL DEFAULT 'draft',
  currency TEXT NOT NULL DEFAULT 'usd',
  provider TEXT NOT NULL DEFAULT 'manual',
  provider_invoice_id TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id),
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status public.payment_status NOT NULL DEFAULT 'pending',
  provider TEXT NOT NULL DEFAULT 'manual',
  provider_payment_id TEXT,
  failure_reason TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Whitelabel Settings
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

-- Usage Daily (metrics)
CREATE TABLE public.usage_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  color_sessions_count INTEGER NOT NULL DEFAULT 0,
  bowls_count INTEGER NOT NULL DEFAULT 0,
  clients_added_count INTEGER NOT NULL DEFAULT 0,
  products_used_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, date)
);

-- Audit Logs
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL REFERENCES auth.users(id),
  actor_type public.actor_type NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Staff
CREATE TABLE public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role public.app_role NOT NULL DEFAULT 'stylist',
  custom_role_name TEXT,
  pin_hash TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  -- Permissions
  can_create_bowls BOOLEAN NOT NULL DEFAULT true,
  can_view_basic_client_info BOOLEAN NOT NULL DEFAULT true,
  can_view_all_clients BOOLEAN NOT NULL DEFAULT true,
  can_manage_clients BOOLEAN NOT NULL DEFAULT false,
  can_manage_own_clients BOOLEAN NOT NULL DEFAULT false,
  can_manage_products BOOLEAN NOT NULL DEFAULT false,
  can_view_product_costs BOOLEAN NOT NULL DEFAULT false,
  can_view_reports BOOLEAN NOT NULL DEFAULT false,
  can_manage_staff BOOLEAN NOT NULL DEFAULT false,
  can_manage_settings BOOLEAN NOT NULL DEFAULT false,
  can_view_own_commission BOOLEAN NOT NULL DEFAULT true,
  -- Commission
  receives_commission BOOLEAN NOT NULL DEFAULT false,
  commission_percent NUMERIC NOT NULL DEFAULT 0,
  has_custom_markup BOOLEAN NOT NULL DEFAULT false,
  custom_markup_percent NUMERIC NOT NULL DEFAULT 0,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Clients
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  preferences TEXT,
  client_since DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Client-Staff Relationships
CREATE TABLE public.client_staff_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL DEFAULT 'worked_with',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, staff_id)
);

-- Products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  line TEXT,
  shade TEXT,
  name TEXT NOT NULL,
  type public.product_type NOT NULL,
  cost_per_unit NUMERIC NOT NULL DEFAULT 0,
  size NUMERIC,
  size_unit TEXT DEFAULT 'oz',
  stock INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER NOT NULL DEFAULT 5,
  target_stock INTEGER NOT NULL DEFAULT 20,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Color Sessions
CREATE TABLE public.color_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  stylist_id UUID REFERENCES public.staff(id),
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount_mixed NUMERIC DEFAULT 0,
  total_amount_used NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Session Bowls
CREATE TABLE public.session_bowls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.color_sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Bowl 1',
  developer_product_id UUID REFERENCES public.products(id),
  developer_amount NUMERIC,
  developer_unit TEXT DEFAULT 'g',
  amount_mixed NUMERIC DEFAULT 0,
  amount_used NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bowl Items
CREATE TABLE public.bowl_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  bowl_id UUID NOT NULL REFERENCES public.session_bowls(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  amount NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT 'g',
  cost NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- PART 3: VIEWS
-- =====================================================

-- Staff Directory (non-sensitive info)
CREATE VIEW public.staff_directory AS
SELECT
  id,
  tenant_id,
  name,
  role,
  custom_role_name,
  is_active,
  created_at
FROM public.staff;

-- Staff with Contacts (for admins)
CREATE VIEW public.staff_with_contacts AS
SELECT
  id,
  tenant_id,
  name,
  email,
  phone,
  role,
  custom_role_name,
  is_active,
  can_create_bowls,
  can_view_basic_client_info,
  can_view_all_clients,
  can_manage_clients,
  can_manage_own_clients,
  can_manage_products,
  can_view_product_costs,
  can_view_reports,
  can_manage_staff,
  can_manage_settings,
  can_view_own_commission,
  created_at,
  updated_at
FROM public.staff;

-- =====================================================
-- PART 4: FUNCTIONS
-- =====================================================

-- Get current user's tenant ID
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.tenant_users
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

-- Check if user is platform admin
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
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

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Check if current user can manage staff
CREATE OR REPLACE FUNCTION public.current_user_can_manage_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff
    WHERE user_id = auth.uid()
      AND tenant_id = get_user_tenant_id()
      AND (can_manage_staff = true OR role IN ('admin', 'owner'))
  )
$$;

-- Handle new user signup (creates profile and assigns default role)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile for all users
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  
  -- Only assign stylist role for non-platform-admin emails
  IF NEW.email != 'brandedbeauty@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'stylist');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Handle platform admin signup (auto-assign platform admin for specific email)
CREATE OR REPLACE FUNCTION public.handle_platform_admin_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- IMPORTANT: Change this email to YOUR admin email
  IF NEW.email = 'brandedbeauty@gmail.com' THEN
    INSERT INTO public.platform_admins (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Calculate bowl item cost from product price
CREATE OR REPLACE FUNCTION public.calculate_bowl_item_cost()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  product_cost DECIMAL(10,2);
BEGIN
  SELECT cost_per_unit INTO product_cost
  FROM public.products
  WHERE id = NEW.product_id;
  
  NEW.cost = COALESCE(product_cost, 0) * NEW.amount;
  RETURN NEW;
END;
$$;

-- Update session totals when bowl items change
CREATE OR REPLACE FUNCTION public.update_session_totals()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  session_uuid UUID;
  total_mixed DECIMAL(10,2);
  total_used DECIMAL(10,2);
  total_session_cost DECIMAL(10,2);
BEGIN
  -- Get session_id from the bowl
  IF TG_OP = 'DELETE' THEN
    SELECT session_id INTO session_uuid FROM public.session_bowls WHERE id = OLD.bowl_id;
  ELSE
    SELECT session_id INTO session_uuid FROM public.session_bowls WHERE id = NEW.bowl_id;
  END IF;
  
  -- Calculate totals
  SELECT 
    COALESCE(SUM(sb.amount_mixed), 0),
    COALESCE(SUM(sb.amount_used), 0),
    COALESCE(SUM(bi.cost), 0)
  INTO total_mixed, total_used, total_session_cost
  FROM public.session_bowls sb
  LEFT JOIN public.bowl_items bi ON bi.bowl_id = sb.id
  WHERE sb.session_id = session_uuid;
  
  -- Update session
  UPDATE public.color_sessions
  SET 
    total_amount_mixed = total_mixed,
    total_amount_used = total_used,
    total_cost = total_session_cost,
    updated_at = now()
  WHERE id = session_uuid;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Protect owner role from being changed
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
    
    -- Ensure owner always has full permissions
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

-- Create staff-client relationship after color session
CREATE OR REPLACE FUNCTION public.create_staff_client_relationship()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create if stylist_id is set
  IF NEW.stylist_id IS NOT NULL THEN
    INSERT INTO public.client_staff_relationships (client_id, staff_id, relationship_type, tenant_id)
    VALUES (NEW.client_id, NEW.stylist_id, 'worked_with', NEW.tenant_id)
    ON CONFLICT (client_id, staff_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- =====================================================
-- PART 5: TRIGGERS
-- =====================================================

-- Auth triggers (on auth.users)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_platform_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_platform_admin_signup();

-- Updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_salon_settings_updated_at
  BEFORE UPDATE ON public.salon_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whitelabel_settings_updated_at
  BEFORE UPDATE ON public.whitelabel_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_staff_updated_at
  BEFORE UPDATE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_color_sessions_updated_at
  BEFORE UPDATE ON public.color_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bowl item cost calculation
CREATE TRIGGER calculate_bowl_item_cost_trigger
  BEFORE INSERT OR UPDATE ON public.bowl_items
  FOR EACH ROW EXECUTE FUNCTION public.calculate_bowl_item_cost();

-- Session totals update
CREATE TRIGGER update_session_totals_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.bowl_items
  FOR EACH ROW EXECUTE FUNCTION public.update_session_totals();

-- Protect owner role
CREATE TRIGGER protect_owner_role_trigger
  BEFORE UPDATE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.protect_owner_role();

-- Create staff-client relationship
CREATE TRIGGER create_staff_client_relationship_trigger
  AFTER INSERT ON public.color_sessions
  FOR EACH ROW EXECUTE FUNCTION public.create_staff_client_relationship();

-- =====================================================
-- PART 6: ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whitelabel_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_staff_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.color_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_bowls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bowl_items ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES POLICIES
-- =====================================================
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- =====================================================
-- USER ROLES POLICIES
-- =====================================================
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- PLATFORM ADMINS POLICIES
-- =====================================================
CREATE POLICY "Platform admins can view platform_admins"
  ON public.platform_admins FOR SELECT
  USING (user_id = auth.uid());

-- =====================================================
-- TENANTS POLICIES
-- =====================================================
CREATE POLICY "Tenant members can view their tenant"
  ON public.tenants FOR SELECT
  USING ((id = get_user_tenant_id()) OR is_platform_admin());

CREATE POLICY "Platform admins can manage tenants"
  ON public.tenants FOR ALL
  USING (is_platform_admin());

-- =====================================================
-- TENANT USERS POLICIES
-- =====================================================
CREATE POLICY "Users can view their tenant membership"
  ON public.tenant_users FOR SELECT
  USING ((user_id = auth.uid()) OR (tenant_id = get_user_tenant_id()) OR is_platform_admin());

CREATE POLICY "Platform admins can manage tenant users"
  ON public.tenant_users FOR ALL
  USING (is_platform_admin());

-- =====================================================
-- SALON SETTINGS POLICIES
-- =====================================================
CREATE POLICY "Tenant users can view their salon settings"
  ON public.salon_settings FOR SELECT
  USING ((tenant_id = get_user_tenant_id()) OR is_platform_admin());

CREATE POLICY "Tenant admins can manage salon settings"
  ON public.salon_settings FOR ALL
  USING ((tenant_id = get_user_tenant_id()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner')));

-- =====================================================
-- PLANS POLICIES
-- =====================================================
CREATE POLICY "Anyone can view active plans"
  ON public.plans FOR SELECT
  USING ((is_active = true) OR is_platform_admin());

CREATE POLICY "Platform admins can manage plans"
  ON public.plans FOR ALL
  USING (is_platform_admin());

-- =====================================================
-- SUBSCRIPTIONS POLICIES
-- =====================================================
CREATE POLICY "Tenant members can view their subscription"
  ON public.subscriptions FOR SELECT
  USING ((tenant_id = get_user_tenant_id()) OR is_platform_admin());

CREATE POLICY "Platform admins can manage subscriptions"
  ON public.subscriptions FOR ALL
  USING (is_platform_admin());

-- =====================================================
-- INVOICES POLICIES
-- =====================================================
CREATE POLICY "Tenant members can view their invoices"
  ON public.invoices FOR SELECT
  USING ((tenant_id = get_user_tenant_id()) OR is_platform_admin());

CREATE POLICY "Platform admins can manage invoices"
  ON public.invoices FOR ALL
  USING (is_platform_admin());

-- =====================================================
-- PAYMENTS POLICIES
-- =====================================================
CREATE POLICY "Tenant members can view their payments"
  ON public.payments FOR SELECT
  USING ((tenant_id = get_user_tenant_id()) OR is_platform_admin());

CREATE POLICY "Platform admins can manage payments"
  ON public.payments FOR ALL
  USING (is_platform_admin());

-- =====================================================
-- WHITELABEL SETTINGS POLICIES
-- =====================================================
CREATE POLICY "Tenant members can view their whitelabel settings"
  ON public.whitelabel_settings FOR SELECT
  USING ((tenant_id = get_user_tenant_id()) OR is_platform_admin());

CREATE POLICY "Platform admins can manage whitelabel settings"
  ON public.whitelabel_settings FOR ALL
  USING (is_platform_admin());

-- =====================================================
-- USAGE DAILY POLICIES
-- =====================================================
CREATE POLICY "Tenant members can view their usage"
  ON public.usage_daily FOR SELECT
  USING ((tenant_id = get_user_tenant_id()) OR is_platform_admin());

CREATE POLICY "Platform admins can manage usage"
  ON public.usage_daily FOR ALL
  USING (is_platform_admin());

-- =====================================================
-- AUDIT LOGS POLICIES
-- =====================================================
CREATE POLICY "Anyone can create audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Platform admins can view all audit logs"
  ON public.audit_logs FOR SELECT
  USING (is_platform_admin() OR ((tenant_id = get_user_tenant_id()) AND (actor_type = 'tenant_user')));

-- =====================================================
-- STAFF POLICIES
-- =====================================================
CREATE POLICY "Users can view own staff record"
  ON public.staff FOR SELECT
  USING ((user_id = auth.uid()) AND (tenant_id = get_user_tenant_id()));

CREATE POLICY "Admins and owners can view all tenant staff"
  ON public.staff FOR SELECT
  USING (((tenant_id = get_user_tenant_id()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner'))) OR is_platform_admin());

CREATE POLICY "Tenant admins can manage staff"
  ON public.staff FOR ALL
  USING ((tenant_id = get_user_tenant_id()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner')));

-- =====================================================
-- CLIENTS POLICIES
-- =====================================================
CREATE POLICY "Tenant users can view their clients"
  ON public.clients FOR SELECT
  USING ((tenant_id = get_user_tenant_id()) OR is_platform_admin());

CREATE POLICY "Tenant users can create clients"
  ON public.clients FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant users can update their clients"
  ON public.clients FOR UPDATE
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant admins can delete clients"
  ON public.clients FOR DELETE
  USING ((tenant_id = get_user_tenant_id()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner')));

-- =====================================================
-- CLIENT STAFF RELATIONSHIPS POLICIES
-- =====================================================
CREATE POLICY "Tenant users can view their relationships"
  ON public.client_staff_relationships FOR SELECT
  USING ((tenant_id = get_user_tenant_id()) OR is_platform_admin());

CREATE POLICY "Tenant users can create relationships"
  ON public.client_staff_relationships FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant admins can delete relationships"
  ON public.client_staff_relationships FOR DELETE
  USING ((tenant_id = get_user_tenant_id()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner')));

-- =====================================================
-- PRODUCTS POLICIES
-- =====================================================
CREATE POLICY "Tenant users can view their products"
  ON public.products FOR SELECT
  USING ((tenant_id = get_user_tenant_id()) OR is_platform_admin());

CREATE POLICY "Tenant users can create products"
  ON public.products FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant users can update their products"
  ON public.products FOR UPDATE
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant admins can delete products"
  ON public.products FOR DELETE
  USING ((tenant_id = get_user_tenant_id()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner')));

-- =====================================================
-- COLOR SESSIONS POLICIES
-- =====================================================
CREATE POLICY "Tenant users can view their sessions"
  ON public.color_sessions FOR SELECT
  USING ((tenant_id = get_user_tenant_id()) OR is_platform_admin());

CREATE POLICY "Tenant users can create sessions"
  ON public.color_sessions FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant users can update their sessions"
  ON public.color_sessions FOR UPDATE
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant admins can delete sessions"
  ON public.color_sessions FOR DELETE
  USING ((tenant_id = get_user_tenant_id()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner')));

-- =====================================================
-- SESSION BOWLS POLICIES
-- =====================================================
CREATE POLICY "Tenant users can view their bowls"
  ON public.session_bowls FOR SELECT
  USING ((tenant_id = get_user_tenant_id()) OR is_platform_admin());

CREATE POLICY "Tenant users can manage bowls"
  ON public.session_bowls FOR ALL
  USING (tenant_id = get_user_tenant_id());

-- =====================================================
-- BOWL ITEMS POLICIES
-- =====================================================
CREATE POLICY "Tenant users can view their bowl items"
  ON public.bowl_items FOR SELECT
  USING ((tenant_id = get_user_tenant_id()) OR is_platform_admin());

CREATE POLICY "Tenant users can manage bowl items"
  ON public.bowl_items FOR ALL
  USING (tenant_id = get_user_tenant_id());

-- =====================================================
-- PART 7: STORAGE BUCKETS
-- =====================================================

-- Create salon-assets bucket for logos and images
INSERT INTO storage.buckets (id, name, public)
VALUES ('salon-assets', 'salon-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for salon-assets bucket
CREATE POLICY "Anyone can view salon assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'salon-assets');

CREATE POLICY "Authenticated users can upload salon assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'salon-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own salon assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'salon-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own salon assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'salon-assets' AND auth.role() = 'authenticated');

-- =====================================================
-- PART 8: SEED DATA (Optional)
-- =====================================================

-- Insert default plans
INSERT INTO public.plans (name, base_price_cents, seat_price_cents, features_json, is_active)
VALUES 
  ('Starter', 0, 0, '{"features": ["Up to 3 staff", "Basic reporting", "500 sessions/month"]}', true),
  ('Professional', 2900, 500, '{"features": ["Unlimited staff", "Advanced reporting", "Unlimited sessions", "Priority support"]}', true),
  ('Enterprise', 9900, 1000, '{"features": ["Everything in Professional", "White-label options", "API access", "Dedicated support"]}', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- IMPORTANT NOTES
-- =====================================================
-- 
-- 1. CHANGE THE PLATFORM ADMIN EMAIL:
--    In the handle_platform_admin_signup() function, change
--    'brandedbeauty@gmail.com' to YOUR admin email address
--
-- 2. AUTHENTICATION SETTINGS:
--    After running this script, go to Authentication > Settings:
--    - Enable "Email" provider
--    - Set "Confirm email" to OFF for development
--
-- 3. EDGE FUNCTIONS:
--    Deploy the edge functions from your GitHub repo's
--    supabase/functions/ folder using Supabase CLI:
--    - supabase functions deploy complete-onboarding
--    - supabase functions deploy manage-pin
--    - supabase functions deploy verify-pin
--
-- 4. ENVIRONMENT VARIABLES:
--    Your new project will have these auto-generated:
--    - SUPABASE_URL
--    - SUPABASE_ANON_KEY
--    - SUPABASE_SERVICE_ROLE_KEY
--
-- =====================================================
