-- Update all SELECT policies to allow public read access

-- Salon Settings
DROP POLICY IF EXISTS "Authenticated users can view salon settings" ON salon_settings;
CREATE POLICY "Anyone can view salon settings" ON salon_settings FOR SELECT USING (true);

-- Color Sessions
DROP POLICY IF EXISTS "Authenticated users can view sessions" ON color_sessions;
CREATE POLICY "Anyone can view sessions" ON color_sessions FOR SELECT USING (true);

-- Bowl Items
DROP POLICY IF EXISTS "Authenticated users can view bowl items" ON bowl_items;
CREATE POLICY "Anyone can view bowl items" ON bowl_items FOR SELECT USING (true);

-- Products
DROP POLICY IF EXISTS "Authenticated users can view products" ON products;
CREATE POLICY "Anyone can view products" ON products FOR SELECT USING (true);

-- Staff
DROP POLICY IF EXISTS "Authenticated users can view active staff" ON staff;
CREATE POLICY "Anyone can view active staff" ON staff FOR SELECT USING (is_active = true);

-- Session Bowls
DROP POLICY IF EXISTS "Authenticated users can view bowls" ON session_bowls;
CREATE POLICY "Anyone can view bowls" ON session_bowls FOR SELECT USING (true);

-- Clients (needed for reports that reference client data)
DROP POLICY IF EXISTS "Authenticated users can view clients" ON clients;
CREATE POLICY "Anyone can view clients" ON clients FOR SELECT USING (true);