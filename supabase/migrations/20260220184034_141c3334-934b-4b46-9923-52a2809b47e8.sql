
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
  SELECT
    COALESCE(SUM(bi.cost), 0)::numeric AS total_product_cost,
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
    ), 0)::numeric AS total_developer_cost,
    COUNT(DISTINCT cs.id)::bigint AS session_count,
    COUNT(DISTINCT sb.id)::bigint AS bowl_count,
    COALESCE(SUM(DISTINCT_ON_BOWL.amount_mixed), 0)::numeric AS total_mixed,
    COALESCE(SUM(DISTINCT_ON_BOWL.amount_used), 0)::numeric AS total_used
  FROM public.color_sessions cs
  JOIN public.session_bowls sb ON sb.session_id = cs.id
  LEFT JOIN public.bowl_items bi ON bi.bowl_id = sb.id
  LEFT JOIN LATERAL (
    SELECT sb2.id AS bowl_id, sb2.amount_mixed, sb2.amount_used
    FROM public.session_bowls sb2
    WHERE sb2.id = sb.id
  ) DISTINCT_ON_BOWL ON true
  WHERE cs.session_date >= p_from_date
    AND cs.session_date <= p_to_date
    AND cs.tenant_id = COALESCE(p_tenant_id, get_user_tenant_id())
    AND (p_stylist_id IS NULL OR cs.stylist_id = p_stylist_id);
END;
$function$;
