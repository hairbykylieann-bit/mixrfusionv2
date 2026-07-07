-- Fix existing products: convert tube price to cost per unit
-- Products where cost_per_unit is > 1 likely have the full tube price stored
UPDATE products 
SET cost_per_unit = cost_per_unit / NULLIF(size, 0)
WHERE cost_per_unit > 1 AND size IS NOT NULL AND size > 0;

-- Recalculate all bowl_items costs based on corrected cost_per_unit
UPDATE bowl_items bi
SET cost = bi.amount * p.cost_per_unit
FROM products p
WHERE bi.product_id = p.id;

-- Recalculate all session totals
UPDATE color_sessions cs
SET total_cost = (
  SELECT COALESCE(SUM(bi.cost), 0)
  FROM session_bowls sb
  JOIN bowl_items bi ON bi.bowl_id = sb.id
  WHERE sb.session_id = cs.id
);