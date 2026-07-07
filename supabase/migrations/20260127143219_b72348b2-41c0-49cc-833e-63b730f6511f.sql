-- First, get the existing Redken Shades EQ catalog ID for inserting products
DO $$
DECLARE
  redken_shades_eq_id uuid;
  kenra_permanent_id uuid;
  kenra_demi_id uuid;
BEGIN
  -- Get existing Redken Shades EQ catalog ID
  SELECT id INTO redken_shades_eq_id FROM product_catalogs WHERE brand = 'Redken' AND line = 'Shades EQ' LIMIT 1;
  
  -- Create Kenra catalogs
  INSERT INTO product_catalogs (brand, line, description, is_active, product_count)
  VALUES ('Kenra', 'Color Permanent', 'Professional permanent hair color with oxidative formula', true, 0)
  ON CONFLICT DO NOTHING
  RETURNING id INTO kenra_permanent_id;
  
  -- If no return (already exists), get the ID
  IF kenra_permanent_id IS NULL THEN
    SELECT id INTO kenra_permanent_id FROM product_catalogs WHERE brand = 'Kenra' AND line = 'Color Permanent' LIMIT 1;
  END IF;
  
  INSERT INTO product_catalogs (brand, line, description, is_active, product_count)
  VALUES ('Kenra', 'Demi-Permanent', 'Deposit-only, ammonia-free color', true, 0)
  ON CONFLICT DO NOTHING
  RETURNING id INTO kenra_demi_id;
  
  IF kenra_demi_id IS NULL THEN
    SELECT id INTO kenra_demi_id FROM product_catalogs WHERE brand = 'Kenra' AND line = 'Demi-Permanent' LIMIT 1;
  END IF;

  -- =====================================================
  -- REDKEN SHADES EQ - Complete Color Library
  -- =====================================================
  
  -- N (Natural) Family - Full range
  INSERT INTO catalog_products (catalog_id, type, name, shade, default_size, default_size_unit, suggested_cost_per_unit)
  VALUES 
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '01N', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '02N', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '03N', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '04N', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '010N', 60, 'ml', 0.18)
  ON CONFLICT DO NOTHING;
  
  -- A (Ash) Family
  INSERT INTO catalog_products (catalog_id, type, name, shade, default_size, default_size_unit, suggested_cost_per_unit)
  VALUES 
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '03A', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '04A', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '05A', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '06A', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '07A', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '08A', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '09A', 60, 'ml', 0.18)
  ON CONFLICT DO NOTHING;
  
  -- B (Beige/Brown) Family
  INSERT INTO catalog_products (catalog_id, type, name, shade, default_size, default_size_unit, suggested_cost_per_unit)
  VALUES 
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '03B', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '04B', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '05B', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '06B', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '07B', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '08B', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '09B', 60, 'ml', 0.18)
  ON CONFLICT DO NOTHING;
  
  -- G (Gold) Family
  INSERT INTO catalog_products (catalog_id, type, name, shade, default_size, default_size_unit, suggested_cost_per_unit)
  VALUES 
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '03G', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '04G', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '05G', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '06G', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '07G', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '08G', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '09G', 60, 'ml', 0.18)
  ON CONFLICT DO NOTHING;
  
  -- C (Copper) Family
  INSERT INTO catalog_products (catalog_id, type, name, shade, default_size, default_size_unit, suggested_cost_per_unit)
  VALUES 
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '04C', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '05C', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '06C', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '07C', 60, 'ml', 0.18)
  ON CONFLICT DO NOTHING;
  
  -- R (Red) Family
  INSERT INTO catalog_products (catalog_id, type, name, shade, default_size, default_size_unit, suggested_cost_per_unit)
  VALUES 
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '04R', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '05R', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '06R', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '07R', 60, 'ml', 0.18)
  ON CONFLICT DO NOTHING;
  
  -- RV (Red Violet) Family
  INSERT INTO catalog_products (catalog_id, type, name, shade, default_size, default_size_unit, suggested_cost_per_unit)
  VALUES 
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '03RV', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '04RV', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '05RV', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '06RV', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '07RV', 60, 'ml', 0.18)
  ON CONFLICT DO NOTHING;
  
  -- V (Violet) Family
  INSERT INTO catalog_products (catalog_id, type, name, shade, default_size, default_size_unit, suggested_cost_per_unit)
  VALUES 
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '03V', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '04V', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '05V', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '06V', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '07V', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '08V', 60, 'ml', 0.18)
  ON CONFLICT DO NOTHING;
  
  -- NB (Natural Brown) Family
  INSERT INTO catalog_products (catalog_id, type, name, shade, default_size, default_size_unit, suggested_cost_per_unit)
  VALUES 
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '04NB', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '05NB', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '06NB', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '07NB', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '08NB', 60, 'ml', 0.18)
  ON CONFLICT DO NOTHING;
  
  -- WB (Warm Brown) Family
  INSERT INTO catalog_products (catalog_id, type, name, shade, default_size, default_size_unit, suggested_cost_per_unit)
  VALUES 
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '04WB', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '05WB', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '06WB', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '07WB', 60, 'ml', 0.18)
  ON CONFLICT DO NOTHING;
  
  -- GB (Gold Beige) Family
  INSERT INTO catalog_products (catalog_id, type, name, shade, default_size, default_size_unit, suggested_cost_per_unit)
  VALUES 
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '05GB', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '06GB', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '07GB', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '08GB', 60, 'ml', 0.18)
  ON CONFLICT DO NOTHING;
  
  -- GN (Gold Natural) Family
  INSERT INTO catalog_products (catalog_id, type, name, shade, default_size, default_size_unit, suggested_cost_per_unit)
  VALUES 
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '05GN', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '06GN', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '07GN', 60, 'ml', 0.18)
  ON CONFLICT DO NOTHING;
  
  -- CB (Cool Blonde) Family
  INSERT INTO catalog_products (catalog_id, type, name, shade, default_size, default_size_unit, suggested_cost_per_unit)
  VALUES 
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '08CB', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '09CB', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '010CB', 60, 'ml', 0.18)
  ON CONFLICT DO NOTHING;
  
  -- VB (Violet Blue) Family
  INSERT INTO catalog_products (catalog_id, type, name, shade, default_size, default_size_unit, suggested_cost_per_unit)
  VALUES 
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '01VB', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '02VB', 60, 'ml', 0.18)
  ON CONFLICT DO NOTHING;
  
  -- Pastel Shades
  INSERT INTO catalog_products (catalog_id, type, name, shade, default_size, default_size_unit, suggested_cost_per_unit)
  VALUES 
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', 'Pastel Pink', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', 'Pastel Peach', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', 'Pastel Lavender', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', 'Pastel Silver', 60, 'ml', 0.18)
  ON CONFLICT DO NOTHING;
  
  -- Specialty / Clear
  INSERT INTO catalog_products (catalog_id, type, name, shade, default_size, default_size_unit, suggested_cost_per_unit)
  VALUES 
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', 'Crystal Clear', 60, 'ml', 0.18),
    (redken_shades_eq_id, 'color', 'Shades EQ Gloss', '000 Clear', 60, 'ml', 0.18)
  ON CONFLICT DO NOTHING;
  
  -- Shades EQ Developers
  INSERT INTO catalog_products (catalog_id, type, name, shade, default_size, default_size_unit, suggested_cost_per_unit)
  VALUES 
    (redken_shades_eq_id, 'developer', 'Shades EQ Processing Solution', NULL, 946, 'ml', 0.02),
    (redken_shades_eq_id, 'developer', 'Shades EQ Gloss to Gel Developer', NULL, 946, 'ml', 0.02)
  ON CONFLICT DO NOTHING;

  -- =====================================================
  -- KENRA COLOR PERMANENT - Complete Color Library
  -- =====================================================
  
  -- N (Natural) Family
  INSERT INTO catalog_products (catalog_id, type, name, shade, default_size, default_size_unit, suggested_cost_per_unit)
  VALUES 
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '1N', 85, 'g', 0.12),
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '2N', 85, 'g', 0.12),
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '3N', 85, 'g', 0.12),
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '4N', 85, 'g', 0.12),
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '5N', 85, 'g', 0.12),
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '6N', 85, 'g', 0.12),
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '7N', 85, 'g', 0.12),
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '8N', 85, 'g', 0.12),
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '9N', 85, 'g', 0.12),
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '10N', 85, 'g', 0.12)
  ON CONFLICT DO NOTHING;
  
  -- A (Ash) Family
  INSERT INTO catalog_products (catalog_id, type, name, shade, default_size, default_size_unit, suggested_cost_per_unit)
  VALUES 
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '4A', 85, 'g', 0.12),
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '5A', 85, 'g', 0.12),
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '6A', 85, 'g', 0.12),
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '7A', 85, 'g', 0.12),
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '8A', 85, 'g', 0.12),
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '9A', 85, 'g', 0.12),
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '10A', 85, 'g', 0.12)
  ON CONFLICT DO NOTHING;
  
  -- G (Gold) Family
  INSERT INTO catalog_products (catalog_id, type, name, shade, default_size, default_size_unit, suggested_cost_per_unit)
  VALUES 
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '4G', 85, 'g', 0.12),
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '5G', 85, 'g', 0.12),
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '6G', 85, 'g', 0.12),
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '7G', 85, 'g', 0.12),
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '8G', 85, 'g', 0.12),
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '9G', 85, 'g', 0.12)
  ON CONFLICT DO NOTHING;
  
  -- B (Brown/Beige) Family
  INSERT INTO catalog_products (catalog_id, type, name, shade, default_size, default_size_unit, suggested_cost_per_unit)
  VALUES 
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '4B', 85, 'g', 0.12),
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '5B', 85, 'g', 0.12),
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '6B', 85, 'g', 0.12),
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '7B', 85, 'g', 0.12),
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '8B', 85, 'g', 0.12)
  ON CONFLICT DO NOTHING;
  
  -- C (Copper) Family
  INSERT INTO catalog_products (catalog_id, type, name, shade, default_size, default_size_unit, suggested_cost_per_unit)
  VALUES 
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '4C', 85, 'g', 0.12),
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '5C', 85, 'g', 0.12),
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '6C', 85, 'g', 0.12),
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '7C', 85, 'g', 0.12)
  ON CONFLICT DO NOTHING;
  
  -- R (Red) Family
  INSERT INTO catalog_products (catalog_id, type, name, shade, default_size, default_size_unit, suggested_cost_per_unit)
  VALUES 
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '4R', 85, 'g', 0.12),
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '5R', 85, 'g', 0.12),
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '6R', 85, 'g', 0.12),
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '7R', 85, 'g', 0.12)
  ON CONFLICT DO NOTHING;
  
  -- RV (Red Violet) Family
  INSERT INTO catalog_products (catalog_id, type, name, shade, default_size, default_size_unit, suggested_cost_per_unit)
  VALUES 
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '4RV', 85, 'g', 0.12),
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '5RV', 85, 'g', 0.12),
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '6RV', 85, 'g', 0.12)
  ON CONFLICT DO NOTHING;
  
  -- V (Violet) Family
  INSERT INTO catalog_products (catalog_id, type, name, shade, default_size, default_size_unit, suggested_cost_per_unit)
  VALUES 
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '5V', 85, 'g', 0.12),
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '6V', 85, 'g', 0.12),
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '7V', 85, 'g', 0.12)
  ON CONFLICT DO NOTHING;
  
  -- SM (Silver Metallics) Family
  INSERT INTO catalog_products (catalog_id, type, name, shade, default_size, default_size_unit, suggested_cost_per_unit)
  VALUES 
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '7SM', 85, 'g', 0.12),
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '8SM', 85, 'g', 0.12),
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '9SM', 85, 'g', 0.12),
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '10SM', 85, 'g', 0.12)
  ON CONFLICT DO NOTHING;
  
  -- RR (Red Red) Family
  INSERT INTO catalog_products (catalog_id, type, name, shade, default_size, default_size_unit, suggested_cost_per_unit)
  VALUES 
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '5RR', 85, 'g', 0.12),
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '6RR', 85, 'g', 0.12),
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '7RR', 85, 'g', 0.12)
  ON CONFLICT DO NOTHING;
  
  -- BC (Blue Copper) Family
  INSERT INTO catalog_products (catalog_id, type, name, shade, default_size, default_size_unit, suggested_cost_per_unit)
  VALUES 
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '5BC', 85, 'g', 0.12),
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '6BC', 85, 'g', 0.12),
    (kenra_permanent_id, 'color', 'Kenra Color Permanent', '7BC', 85, 'g', 0.12)
  ON CONFLICT DO NOTHING;
  
  -- Kenra Developers
  INSERT INTO catalog_products (catalog_id, type, name, shade, default_size, default_size_unit, suggested_cost_per_unit)
  VALUES 
    (kenra_permanent_id, 'developer', 'Kenra Creme Developer', '10 Volume', 946, 'ml', 0.02),
    (kenra_permanent_id, 'developer', 'Kenra Creme Developer', '20 Volume', 946, 'ml', 0.02),
    (kenra_permanent_id, 'developer', 'Kenra Creme Developer', '30 Volume', 946, 'ml', 0.02),
    (kenra_permanent_id, 'developer', 'Kenra Creme Developer', '40 Volume', 946, 'ml', 0.02)
  ON CONFLICT DO NOTHING;

  -- =====================================================
  -- KENRA DEMI-PERMANENT - Complete Color Library
  -- =====================================================
  
  -- N (Natural) Family
  INSERT INTO catalog_products (catalog_id, type, name, shade, default_size, default_size_unit, suggested_cost_per_unit)
  VALUES 
    (kenra_demi_id, 'color', 'Kenra Demi-Permanent', '2N', 58, 'g', 0.14),
    (kenra_demi_id, 'color', 'Kenra Demi-Permanent', '3N', 58, 'g', 0.14),
    (kenra_demi_id, 'color', 'Kenra Demi-Permanent', '4N', 58, 'g', 0.14),
    (kenra_demi_id, 'color', 'Kenra Demi-Permanent', '5N', 58, 'g', 0.14),
    (kenra_demi_id, 'color', 'Kenra Demi-Permanent', '6N', 58, 'g', 0.14),
    (kenra_demi_id, 'color', 'Kenra Demi-Permanent', '7N', 58, 'g', 0.14),
    (kenra_demi_id, 'color', 'Kenra Demi-Permanent', '8N', 58, 'g', 0.14),
    (kenra_demi_id, 'color', 'Kenra Demi-Permanent', '9N', 58, 'g', 0.14),
    (kenra_demi_id, 'color', 'Kenra Demi-Permanent', '10N', 58, 'g', 0.14)
  ON CONFLICT DO NOTHING;
  
  -- A (Ash) Family
  INSERT INTO catalog_products (catalog_id, type, name, shade, default_size, default_size_unit, suggested_cost_per_unit)
  VALUES 
    (kenra_demi_id, 'color', 'Kenra Demi-Permanent', '5A', 58, 'g', 0.14),
    (kenra_demi_id, 'color', 'Kenra Demi-Permanent', '6A', 58, 'g', 0.14),
    (kenra_demi_id, 'color', 'Kenra Demi-Permanent', '7A', 58, 'g', 0.14),
    (kenra_demi_id, 'color', 'Kenra Demi-Permanent', '8A', 58, 'g', 0.14),
    (kenra_demi_id, 'color', 'Kenra Demi-Permanent', '9A', 58, 'g', 0.14)
  ON CONFLICT DO NOTHING;
  
  -- G (Gold) Family
  INSERT INTO catalog_products (catalog_id, type, name, shade, default_size, default_size_unit, suggested_cost_per_unit)
  VALUES 
    (kenra_demi_id, 'color', 'Kenra Demi-Permanent', '5G', 58, 'g', 0.14),
    (kenra_demi_id, 'color', 'Kenra Demi-Permanent', '6G', 58, 'g', 0.14),
    (kenra_demi_id, 'color', 'Kenra Demi-Permanent', '7G', 58, 'g', 0.14),
    (kenra_demi_id, 'color', 'Kenra Demi-Permanent', '8G', 58, 'g', 0.14)
  ON CONFLICT DO NOTHING;
  
  -- B (Brown/Beige) Family
  INSERT INTO catalog_products (catalog_id, type, name, shade, default_size, default_size_unit, suggested_cost_per_unit)
  VALUES 
    (kenra_demi_id, 'color', 'Kenra Demi-Permanent', '5B', 58, 'g', 0.14),
    (kenra_demi_id, 'color', 'Kenra Demi-Permanent', '6B', 58, 'g', 0.14),
    (kenra_demi_id, 'color', 'Kenra Demi-Permanent', '7B', 58, 'g', 0.14),
    (kenra_demi_id, 'color', 'Kenra Demi-Permanent', '8B', 58, 'g', 0.14)
  ON CONFLICT DO NOTHING;
  
  -- C (Copper) Family
  INSERT INTO catalog_products (catalog_id, type, name, shade, default_size, default_size_unit, suggested_cost_per_unit)
  VALUES 
    (kenra_demi_id, 'color', 'Kenra Demi-Permanent', '5C', 58, 'g', 0.14),
    (kenra_demi_id, 'color', 'Kenra Demi-Permanent', '6C', 58, 'g', 0.14),
    (kenra_demi_id, 'color', 'Kenra Demi-Permanent', '7C', 58, 'g', 0.14)
  ON CONFLICT DO NOTHING;
  
  -- R (Red) Family
  INSERT INTO catalog_products (catalog_id, type, name, shade, default_size, default_size_unit, suggested_cost_per_unit)
  VALUES 
    (kenra_demi_id, 'color', 'Kenra Demi-Permanent', '5R', 58, 'g', 0.14),
    (kenra_demi_id, 'color', 'Kenra Demi-Permanent', '6R', 58, 'g', 0.14),
    (kenra_demi_id, 'color', 'Kenra Demi-Permanent', '7R', 58, 'g', 0.14)
  ON CONFLICT DO NOTHING;
  
  -- Clear
  INSERT INTO catalog_products (catalog_id, type, name, shade, default_size, default_size_unit, suggested_cost_per_unit)
  VALUES 
    (kenra_demi_id, 'color', 'Kenra Demi-Permanent', 'Clear', 58, 'g', 0.14)
  ON CONFLICT DO NOTHING;
  
  -- Kenra Demi Activator
  INSERT INTO catalog_products (catalog_id, type, name, shade, default_size, default_size_unit, suggested_cost_per_unit)
  VALUES 
    (kenra_demi_id, 'developer', 'Kenra Demi-Permanent Activator', NULL, 946, 'ml', 0.02)
  ON CONFLICT DO NOTHING;

END $$;