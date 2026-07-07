
CREATE OR REPLACE FUNCTION public.get_report_aggregates(
  p_from_date date,
  p_to_date date,
  p_stylist_id uuid DEFAULT NULL,
  p_tenant_id uuid DEFAULT NULL
)
RETURNS TABLE(
  total_product_cost numeric,
  total_developer_cost numeric,
  session_count bigint,
  bowl_count bigint,
  total_mixed numeric,
  total_used numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
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
            CASE
              WHEN COALESCE(sb.developer_unit, 'g') = COALESCE(p.size_unit, 'g') THEN sb.developer_amount
              WHEN sb.developer_unit = 'oz' AND p.size_unit = 'ml' THEN sb.developer_amount * 29.5735
              WHEN sb.developer_unit = 'oz' AND p.size_unit = 'g' THEN sb.developer_amount * 28.3495
              WHEN sb.developer_unit = 'ml' AND p.size_unit = 'oz' THEN sb.developer_amount * 0.033814
              WHEN sb.developer_unit = 'ml' AND p.size_unit = 'g' THEN sb.developer_amount
              WHEN sb.developer_unit = 'g' AND p.size_unit = 'oz' THEN sb.developer_amount * 0.035274
              WHEN sb.developer_unit = 'g' AND p.size_unit = 'ml' THEN sb.developer_amount
              ELSE sb.developer_amount
            END
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
