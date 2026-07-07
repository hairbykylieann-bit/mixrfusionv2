-- ============================================================================
-- MATH CORE FIX — 2026-07-06
-- Fixes the two database-side root causes from the Math Audit:
--
-- (1) update_session_totals(): the old LEFT JOIN fanned out session_bowls rows
--     once per bowl_item, so a 100g bowl with 4 products was stored as 400g
--     mixed. Rewritten with separate subqueries (no fan-out).
--
-- (2) calculate_bowl_item_cost(): unit factors now EXACTLY match the app's
--     canonical module src/lib/units.ts — grams canonical, 1 oz = 28.3495 g
--     (weight ounce; color is weighed on a scale), g ≈ ml for hair products.
--     The old versions either skipped conversion entirely (pre-2026-02 rows)
--     or used fluid ounces (29.5735), disagreeing with the app by ~4.3%.
--
-- (3) BACKFILL: recomputes every historical bowl_items.cost and all
--     color_sessions totals so old reports stop lying.
--
-- If the factor table in src/lib/units.ts ever changes, this function must
-- change in the same commit.
-- ============================================================================

-- Single source of truth for unit factors, DB-side (mirrors src/lib/units.ts)
CREATE OR REPLACE FUNCTION public.unit_to_grams_factor(u text)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE lower(COALESCE(u, 'g'))
    WHEN 'g'      THEN 1
    WHEN 'ml'     THEN 1
    WHEN 'oz'     THEN 28.3495
    WHEN 'l'      THEN 1000
    WHEN 'liter'  THEN 1000
    WHEN 'kg'     THEN 1000
    WHEN 'lb'     THEN 453.592
    WHEN 'gal'    THEN 3785.41
    WHEN 'gallon' THEN 3785.41
    ELSE 1
  END;
$$;

-- (2) Bowl item cost: convert item amount into the product's size_unit, then
-- multiply by cost_per_unit (which is cost per single size_unit).
CREATE OR REPLACE FUNCTION public.calculate_bowl_item_cost()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  product_cost DECIMAL(12,6);
  product_size_unit TEXT;
  converted_amount DECIMAL(14,4);
BEGIN
  SELECT cost_per_unit, size_unit INTO product_cost, product_size_unit
  FROM public.products
  WHERE id = NEW.product_id;

  converted_amount = NEW.amount
    * public.unit_to_grams_factor(NEW.unit)
    / public.unit_to_grams_factor(product_size_unit);

  NEW.cost = COALESCE(product_cost, 0) * converted_amount;
  RETURN NEW;
END;
$function$;

-- (1) Session totals: separate subqueries — NO join between session_bowls and
-- bowl_items, so bowl amounts are counted exactly once.
CREATE OR REPLACE FUNCTION public.update_session_totals()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  session_uuid UUID;
  total_mixed DECIMAL(12,2);
  total_used DECIMAL(12,2);
  total_session_cost DECIMAL(12,2);
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT session_id INTO session_uuid FROM public.session_bowls WHERE id = OLD.bowl_id;
  ELSE
    SELECT session_id INTO session_uuid FROM public.session_bowls WHERE id = NEW.bowl_id;
  END IF;

  IF session_uuid IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(sb.amount_mixed), 0), COALESCE(SUM(sb.amount_used), 0)
  INTO total_mixed, total_used
  FROM public.session_bowls sb
  WHERE sb.session_id = session_uuid;

  SELECT COALESCE(SUM(bi.cost), 0)
  INTO total_session_cost
  FROM public.bowl_items bi
  WHERE bi.bowl_id IN (SELECT id FROM public.session_bowls WHERE session_id = session_uuid);

  UPDATE public.color_sessions
  SET
    total_amount_mixed = total_mixed,
    total_amount_used = total_used,
    total_cost = total_session_cost,
    updated_at = now()
  WHERE id = session_uuid;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

-- ============================================================================
-- (3) BACKFILL — one-time repair of historical data
-- ============================================================================

-- 3a. Recompute every bowl item's cost with the canonical unit math.
UPDATE public.bowl_items bi
SET cost = COALESCE(p.cost_per_unit, 0) * bi.amount
  * public.unit_to_grams_factor(bi.unit)
  / public.unit_to_grams_factor(p.size_unit)
FROM public.products p
WHERE p.id = bi.product_id;

-- 3b. Recompute all session totals from scratch (fixes fan-out-inflated rows).
UPDATE public.color_sessions cs
SET
  total_amount_mixed = COALESCE(b.mixed, 0),
  total_amount_used  = COALESCE(b.used, 0),
  total_cost         = COALESCE(c.cost, 0),
  updated_at = now()
FROM (
  SELECT session_id, SUM(amount_mixed) AS mixed, SUM(amount_used) AS used
  FROM public.session_bowls
  GROUP BY session_id
) b
LEFT JOIN (
  SELECT sb.session_id, SUM(bi.cost) AS cost
  FROM public.bowl_items bi
  JOIN public.session_bowls sb ON sb.id = bi.bowl_id
  GROUP BY sb.session_id
) c ON c.session_id = b.session_id
WHERE cs.id = b.session_id;
