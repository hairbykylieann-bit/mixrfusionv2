-- Patch get_report_aggregates: legacy developer cost CASE was missing L/l/liter/gal/gallon branches.
CREATE OR REPLACE FUNCTION public.get_report_aggregates(p_from_date date, p_to_date date, p_stylist_id uuid DEFAULT NULL::uuid, p_tenant_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(total_product_cost numeric, total_developer_cost numeric, session_count bigint, bowl_count bigint, total_mixed numeric, total_used numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH filtered_sessions AS (
    SELECT cs.id AS session_id
    FROM public.color_sessions cs
    WHERE cs.session_date >= p_from_date
      AND cs.session_date <= p_to_date
      AND cs.tenant_id = COALESCE(p_tenant_id, get_user_tenant_id())
      AND (p_stylist_id IS NULL OR cs.stylist_id = p_stylist_id)
  ),
  bowl_aggs AS (
    SELECT
      COUNT(sb.id) AS bowl_count,
      COALESCE(SUM(sb.amount_mixed), 0) AS total_mixed,
      COALESCE(SUM(sb.amount_used), 0) AS total_used,
      COALESCE(SUM(
        CASE WHEN sb.developer_product_id IS NOT NULL AND sb.developer_amount IS NOT NULL THEN
          (SELECT ROUND(p.cost_per_unit *
            -- Convert bowl developer amount into the product's size_unit via ml
            (
              (
                CASE COALESCE(sb.developer_unit, 'g')
                  WHEN 'ml' THEN sb.developer_amount
                  WHEN 'g'  THEN sb.developer_amount
                  WHEN 'oz' THEN sb.developer_amount * 29.5735
                  WHEN 'L'  THEN sb.developer_amount * 1000
                  WHEN 'l'  THEN sb.developer_amount * 1000
                  WHEN 'liter' THEN sb.developer_amount * 1000
                  WHEN 'gal' THEN sb.developer_amount * 3785.41
                  WHEN 'gallon' THEN sb.developer_amount * 3785.41
                  ELSE sb.developer_amount
                END
              )
              /
              NULLIF(
                CASE COALESCE(p.size_unit, 'ml')
                  WHEN 'ml' THEN 1
                  WHEN 'g'  THEN 1
                  WHEN 'oz' THEN 29.5735
                  WHEN 'L'  THEN 1000
                  WHEN 'l'  THEN 1000
                  WHEN 'liter' THEN 1000
                  WHEN 'gal' THEN 3785.41
                  WHEN 'gallon' THEN 3785.41
                  ELSE 1
                END, 0)
            )
          , 2) FROM public.products p WHERE p.id = sb.developer_product_id)
        ELSE 0
        END
      ), 0) AS total_developer_cost
    FROM public.session_bowls sb
    WHERE sb.session_id IN (SELECT session_id FROM filtered_sessions)
  ),
  item_aggs AS (
    SELECT COALESCE(SUM(bi.cost), 0) AS total_product_cost
    FROM public.bowl_items bi
    WHERE bi.bowl_id IN (
      SELECT sb.id FROM public.session_bowls sb
      WHERE sb.session_id IN (SELECT session_id FROM filtered_sessions)
    )
  )
  SELECT
    ia.total_product_cost::numeric,
    ba.total_developer_cost::numeric,
    (SELECT COUNT(DISTINCT session_id) FROM filtered_sessions)::bigint,
    ba.bowl_count::bigint,
    ba.total_mixed::numeric,
    ba.total_used::numeric
  FROM bowl_aggs ba, item_aggs ia;
END;
$function$;

-- Patch calculate_bowl_item_cost: add 'gallon' alias so legacy imports don't silently identity-fallback.
CREATE OR REPLACE FUNCTION public.calculate_bowl_item_cost()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  product_cost DECIMAL(10,4);
  product_size_unit TEXT;
  converted_amount DECIMAL(10,4);
  amount_ml DECIMAL(14,4);
BEGIN
  SELECT cost_per_unit, size_unit INTO product_cost, product_size_unit
  FROM public.products
  WHERE id = NEW.product_id;

  IF NEW.unit = COALESCE(product_size_unit, 'g') OR product_size_unit IS NULL THEN
    converted_amount = NEW.amount;
  ELSE
    amount_ml = CASE NEW.unit
      WHEN 'ml' THEN NEW.amount
      WHEN 'g'  THEN NEW.amount
      WHEN 'oz' THEN NEW.amount * 29.5735
      WHEN 'L'  THEN NEW.amount * 1000
      WHEN 'l'  THEN NEW.amount * 1000
      WHEN 'liter' THEN NEW.amount * 1000
      WHEN 'gal' THEN NEW.amount * 3785.41
      WHEN 'gallon' THEN NEW.amount * 3785.41
      ELSE NEW.amount
    END;

    converted_amount = CASE product_size_unit
      WHEN 'ml' THEN amount_ml
      WHEN 'g'  THEN amount_ml
      WHEN 'oz' THEN amount_ml * 0.033814
      WHEN 'L'  THEN amount_ml / 1000
      WHEN 'l'  THEN amount_ml / 1000
      WHEN 'liter' THEN amount_ml / 1000
      WHEN 'gal' THEN amount_ml / 3785.41
      WHEN 'gallon' THEN amount_ml / 3785.41
      ELSE NEW.amount
    END;
  END IF;

  NEW.cost = ROUND(COALESCE(product_cost, 0) * converted_amount, 2);
  RETURN NEW;
END;
$function$;