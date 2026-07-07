-- =============================================
-- MIXR FUSION SALON DATABASE SCHEMA
-- Complete setup: tables, functions, RLS, triggers
-- =============================================

-- 1. ENUM TYPES
-- =============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'owner', 'stylist', 'assistant');
CREATE TYPE public.product_type AS ENUM ('Color', 'Developer', 'Lightener', 'Treatment');
CREATE TYPE public.product_status AS ENUM ('In Stock', 'Low Stock', 'Out of Stock');

-- 2. CORE TABLES (no dependencies)
-- =============================================

-- PROFILES TABLE (auto-created on user signup)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- USER ROLES TABLE (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- STAFF TABLE
CREATE TABLE public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role app_role NOT NULL DEFAULT 'stylist',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CLIENTS TABLE
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  preferences TEXT,
  client_since DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PRODUCTS TABLE (Inventory)
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type product_type NOT NULL,
  brand TEXT NOT NULL,
  line TEXT,
  shade TEXT,
  name TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER NOT NULL DEFAULT 5,
  target_stock INTEGER NOT NULL DEFAULT 20,
  size DECIMAL(10,2),
  size_unit TEXT DEFAULT 'oz',
  cost_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- COLOR SESSIONS TABLE (Client visits)
CREATE TABLE public.color_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  stylist_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount_mixed DECIMAL(10,2) DEFAULT 0,
  total_amount_used DECIMAL(10,2) DEFAULT 0,
  total_cost DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SESSION BOWLS TABLE (Individual bowls in a session)
CREATE TABLE public.session_bowls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.color_sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Bowl 1',
  developer_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  developer_amount DECIMAL(10,2),
  developer_unit TEXT DEFAULT 'g',
  amount_mixed DECIMAL(10,2) DEFAULT 0,
  amount_used DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- BOWL ITEMS TABLE (Products used in each bowl)
CREATE TABLE public.bowl_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bowl_id UUID NOT NULL REFERENCES public.session_bowls(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL DEFAULT 'g',
  cost DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. ENABLE RLS ON ALL TABLES
-- =============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.color_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_bowls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bowl_items ENABLE ROW LEVEL SECURITY;

-- 4. SECURITY DEFINER FUNCTION (now table exists)
-- =============================================
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

-- 5. RLS POLICIES
-- =============================================

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- User roles policies
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Staff policies
CREATE POLICY "Authenticated users can view active staff"
  ON public.staff FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins and owners can manage staff"
  ON public.staff FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- Clients policies
CREATE POLICY "Authenticated users can view clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create clients"
  ON public.clients FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update clients"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins and owners can delete clients"
  ON public.clients FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- Products policies
CREATE POLICY "Authenticated users can view products"
  ON public.products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage products"
  ON public.products FOR ALL
  TO authenticated
  USING (true);

-- Color sessions policies
CREATE POLICY "Authenticated users can view sessions"
  ON public.color_sessions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create sessions"
  ON public.color_sessions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sessions"
  ON public.color_sessions FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins and owners can delete sessions"
  ON public.color_sessions FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- Session bowls policies
CREATE POLICY "Authenticated users can view bowls"
  ON public.session_bowls FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage bowls"
  ON public.session_bowls FOR ALL
  TO authenticated
  USING (true);

-- Bowl items policies
CREATE POLICY "Authenticated users can view bowl items"
  ON public.bowl_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage bowl items"
  ON public.bowl_items FOR ALL
  TO authenticated
  USING (true);

-- 6. HELPER FUNCTIONS
-- =============================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  -- Assign default role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'stylist');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to calculate bowl item cost
CREATE OR REPLACE FUNCTION public.calculate_bowl_item_cost()
RETURNS TRIGGER AS $$
DECLARE
  product_cost DECIMAL(10,2);
BEGIN
  SELECT cost_per_unit INTO product_cost
  FROM public.products
  WHERE id = NEW.product_id;
  
  NEW.cost = COALESCE(product_cost, 0) * NEW.amount;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function to update session totals
CREATE OR REPLACE FUNCTION public.update_session_totals()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SET search_path = public;

-- 7. TRIGGERS
-- =============================================

-- Auto-update timestamps
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
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

-- Auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-calculate bowl item cost
CREATE TRIGGER calculate_bowl_item_cost_trigger
  BEFORE INSERT OR UPDATE ON public.bowl_items
  FOR EACH ROW EXECUTE FUNCTION public.calculate_bowl_item_cost();

-- Auto-update session totals when bowl items change
CREATE TRIGGER update_session_totals_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.bowl_items
  FOR EACH ROW EXECUTE FUNCTION public.update_session_totals();