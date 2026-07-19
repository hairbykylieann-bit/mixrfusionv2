// Shared service-aware revenue math for salon reports.
// Single source of truth used by useReportsData (salon-wide), useStaffReport (per-stylist),
// useSessionFinancials (per-session), NewBowl ChargeSummary, and BowlCard.
//
// Key invariants:
//  1. Product cost for a bowl is the SUM of that bowl's bowl_items.cost, PLUS the
//     legacy `session_bowls.developer_*` slot ONLY when the bowl has no developer
//     bowl_items (i.e. it's an old session pre-March-2026). This prevents the
//     double-count that was showing up in reports for every new session.
//  2. Overage is calculated per product-type bucket:
//       - "color-bucket" = color + toner  (grouped per user)
//       - "lightener-bucket" = lightener
//       - "developer-bucket" = all developer usage
//     Each bucket compares actual usage against the sum of matching service
//     components. Overage cost is only charged on buckets that exceeded.

export { convertAmountBetweenUnits } from "@/lib/units";
import { convertAmountBetweenUnits } from "@/lib/units";


export type ProductBucket = 'color' | 'lightener' | 'developer';

/**
 * Map a raw product type string (from products.type or item_type) into one of
 * the three overage buckets. Toner rolls up with color per product decision.
 */
export function bucketForProductType(rawType: string | null | undefined, itemType?: string | null): ProductBucket {
  if (itemType === 'developer') return 'developer';
  const t = (rawType || '').toLowerCase();
  if (t === 'developer') return 'developer';
  if (t === 'lightener') return 'lightener';
  // color, toner, additive, treatment, and anything else charge as color bucket
  return 'color';
}

export interface ServiceComponent {
  product_type: 'color' | 'lightener' | 'toner';
  product_amount: number;
  product_unit: string;
  developer_amount: number;
  developer_unit: string;
}

export interface ServiceMenuItem {
  id: string;
  name: string;
  price: number;
  // Legacy single-slot fields — used only when components[] is empty.
  color_amount: number;
  color_unit: string;
  developer_amount: number;
  developer_unit: string;
  components?: ServiceComponent[];
}

export interface RevenueSettings {
  backbar_multiplier: number;
  bowl_fee: number;
  /** Waste factor % applied to product charges to match the in-session live preview. */
  waste_factor_percent?: number;
}

/**
 * Normalized item shape used by the engine. Each row is one entered product,
 * whether it came from bowl_items or the legacy session_bowls.developer_* slot.
 */
export interface EngineItem {
  bowl_id: string;
  product_id: string | null;
  bucket: ProductBucket;
  amount_g: number;
  cost: number;
}

export interface EngineBowlInput {
  id: string;
  session_id: string;
  amount_mixed: number | null;
  amount_used: number | null;
  developer_product_id: string | null;
  developer_amount: number | null;
  developer_unit: string | null;
  developer: { cost_per_unit: number | null; size_unit: string | null } | null;
}

export interface EngineItemInput {
  bowl_id: string;
  product_id: string | null;
  amount: number | null;
  unit: string | null;
  cost: number | null;
  item_type?: string | null;
  products?: { type?: string | null } | null;
}

/**
 * Build the normalized item list from raw bowls + bowl_items, deduping the
 * legacy developer slot when a bowl already has developer bowl_items.
 */
export function buildEngineItems(
  bowls: EngineBowlInput[],
  items: EngineItemInput[],
): EngineItem[] {
  const bowlHasDevItem = new Set<string>();
  const out: EngineItem[] = [];

  for (const it of items) {
    const bucket = bucketForProductType(it.products?.type ?? null, it.item_type ?? null);
    if (bucket === 'developer') bowlHasDevItem.add(it.bowl_id);
    out.push({
      bowl_id: it.bowl_id,
      product_id: it.product_id,
      bucket,
      amount_g: convertAmountBetweenUnits(Number(it.amount) || 0, it.unit || 'g', 'g'),
      cost: Number(it.cost) || 0,
    });
  }

  // Legacy developer slot: only include when the bowl has NO developer bowl_items.
  for (const b of bowls) {
    if (bowlHasDevItem.has(b.id)) continue;
    if (!b.developer_product_id || !b.developer_amount || !b.developer) continue;
    const devUnit = b.developer_unit || 'g';
    const devSizeUnit = b.developer.size_unit || 'ml';
    const amount = Number(b.developer_amount) || 0;
    const amountInProductUnit = convertAmountBetweenUnits(amount, devUnit, devSizeUnit);
    const cost = amountInProductUnit * (Number(b.developer.cost_per_unit) || 0);
    out.push({
      bowl_id: b.id,
      product_id: b.developer_product_id,
      bucket: 'developer',
      amount_g: convertAmountBetweenUnits(amount, devUnit, 'g'),
      cost,
    });
  }

  return out;
}

export interface SessionRevenue {
  grossRevenue: number;
  serviceRevenue: number;   // labor portion (service price)
  overageRevenue: number;   // amount charged on top for going over allotment
  bowlFeeRevenue: number;
  productCharge: number;    // total product-related charge (overage or no-service markup)
  productCost: number;      // wholesale COGS for this session
  bowlCount: number;
}

/**
 * Get allotments per bucket from the service. Prefers components[] when present,
 * falls back to legacy color_amount/developer_amount slot.
 * Returned amounts are normalized to grams.
 */
function allotmentsGramsForService(service: ServiceMenuItem): Record<ProductBucket, number> {
  const out: Record<ProductBucket, number> = { color: 0, lightener: 0, developer: 0 };

  if (service.components && service.components.length > 0) {
    for (const c of service.components) {
      const bucket: ProductBucket = c.product_type === 'lightener' ? 'lightener' : 'color';
      out[bucket] += convertAmountBetweenUnits(c.product_amount, c.product_unit, 'g');
      out.developer += convertAmountBetweenUnits(c.developer_amount, c.developer_unit, 'g');
    }
    return out;
  }

  // Legacy fallback
  out.color = convertAmountBetweenUnits(service.color_amount || 0, service.color_unit || 'g', 'g');
  out.developer = convertAmountBetweenUnits(service.developer_amount || 0, service.developer_unit || 'g', 'g');
  return out;
}

/**
 * Calculate one session's revenue given the pre-built engine items and its service.
 */
export function calculateSessionRevenueV2(
  serviceId: string | null,
  bowlCount: number,
  sessionItems: EngineItem[],
  serviceMap: Map<string, ServiceMenuItem>,
  settings: RevenueSettings,
): SessionRevenue {
  const bowlFeeRevenue = bowlCount * (settings.bowl_fee || 0);
  const mult = settings.backbar_multiplier || 1;
  // Match the in-session live preview: waste factor inflates product charges,
  // never labor or bowl fees.
  const wasteMul = 1 + (settings.waste_factor_percent || 0) / 100;

  // Per-bucket totals
  const usedG: Record<ProductBucket, number> = { color: 0, lightener: 0, developer: 0 };
  const costByBucket: Record<ProductBucket, number> = { color: 0, lightener: 0, developer: 0 };
  for (const it of sessionItems) {
    usedG[it.bucket] += it.amount_g;
    costByBucket[it.bucket] += it.cost;
  }
  const productCost = costByBucket.color + costByBucket.lightener + costByBucket.developer;

  const service = serviceId ? serviceMap.get(serviceId) || null : null;

  if (!service) {
    // No service linked — charge product cost × multiplier × waste + bowl fees.
    const productCharge = productCost * mult * wasteMul;
    return {
      grossRevenue: productCharge + bowlFeeRevenue,
      serviceRevenue: 0,
      overageRevenue: 0,
      bowlFeeRevenue,
      productCharge,
      productCost,
      bowlCount,
    };
  }

  const allot = allotmentsGramsForService(service);

  // Per-bucket overage cost. Charge markup ONLY on the wholesale cost of the
  // overage portion of each bucket.
  let overageCost = 0;
  (['color', 'lightener', 'developer'] as ProductBucket[]).forEach((b) => {
    const used = usedG[b];
    const allowed = allot[b];
    if (used <= 0 || allowed <= 0) {
      // If used > 0 but no allotment exists for this bucket, treat the ENTIRE
      // usage as overage so a stylist who uses lightener in a color-only
      // service still gets that product charged.
      if (used > 0 && allowed <= 0) overageCost += costByBucket[b];
      return;
    }
    const overRatio = Math.max(0, (used - allowed) / used);
    overageCost += costByBucket[b] * overRatio;
  });

  const overageCharge = overageCost * mult * wasteMul;

  return {
    grossRevenue: service.price + overageCharge + bowlFeeRevenue,
    serviceRevenue: service.price,
    overageRevenue: overageCharge,
    bowlFeeRevenue,
    productCharge: overageCharge,
    productCost,
    bowlCount,
  };
}

// ─── Period aggregation ────────────────────────────────────────────────────

export interface PeriodInputs {
  sessions: Array<{ id: string; service_id: string | null; total_amount_mixed: number | null; total_amount_used: number | null; charged_amount?: number | null }>;
  bowls: EngineBowlInput[];
  items: EngineItemInput[];
  serviceMap: Map<string, ServiceMenuItem>;
  settings: RevenueSettings;
}

export interface PeriodTotals {
  totalRevenue: number;
  serviceRevenue: number;
  overageRevenue: number;
  bowlFeeRevenue: number;
  markupRevenue: number;
  totalProductCost: number;
  totalMixedG: number;
  totalUsedG: number;
  sessionCount: number;
  bowlCount: number;
  perSession: Map<string, SessionRevenue>;
}

export function calculatePeriodTotals({ sessions, bowls, items, serviceMap, settings }: PeriodInputs): PeriodTotals {
  const engineItems = buildEngineItems(bowls, items);

  const bowlsBySession = new Map<string, EngineBowlInput[]>();
  bowls.forEach((b) => {
    const arr = bowlsBySession.get(b.session_id) || [];
    arr.push(b);
    bowlsBySession.set(b.session_id, arr);
  });

  const itemsByBowl = new Map<string, EngineItem[]>();
  engineItems.forEach((it) => {
    const arr = itemsByBowl.get(it.bowl_id) || [];
    arr.push(it);
    itemsByBowl.set(it.bowl_id, arr);
  });

  let totalRevenue = 0;
  let totalServiceRevenue = 0;
  let totalOverageRevenue = 0;
  let totalBowlFeeRevenue = 0;
  let totalProductCost = 0;
  const perSession = new Map<string, SessionRevenue>();

  sessions.forEach((session) => {
    const sBowls = bowlsBySession.get(session.id) || [];
    const sessionItems: EngineItem[] = [];
    sBowls.forEach((b) => {
      const arr = itemsByBowl.get(b.id) || [];
      sessionItems.push(...arr);
    });

    const rev = calculateSessionRevenueV2(
      session.service_id,
      sBowls.length,
      sessionItems,
      serviceMap,
      settings,
    );

    // If the stylist's quoted charge was persisted at save time, use it as the
    // gross revenue so reports always match what the client was charged.
    if (session.charged_amount != null) {
      rev.grossRevenue = Number(session.charged_amount);
    }

    perSession.set(session.id, rev);

    totalRevenue += rev.grossRevenue;
    totalServiceRevenue += rev.serviceRevenue;
    totalOverageRevenue += rev.overageRevenue;
    totalBowlFeeRevenue += rev.bowlFeeRevenue;
    totalProductCost += rev.productCost;
  });

  const totalMixedG = sessions.reduce((s, x) => s + (Number(x.total_amount_mixed) || 0), 0);
  const totalUsedG = sessions.reduce((s, x) => s + (Number(x.total_amount_used) || 0), 0);

  // markup = anything left after wholesale cost, bowl fees, and labor portion of service prices.
  const markupRevenue = totalRevenue - totalProductCost - totalBowlFeeRevenue - totalServiceRevenue;

  return {
    totalRevenue,
    serviceRevenue: totalServiceRevenue,
    overageRevenue: totalOverageRevenue,
    bowlFeeRevenue: totalBowlFeeRevenue,
    markupRevenue,
    totalProductCost,
    totalMixedG,
    totalUsedG,
    sessionCount: sessions.length,
    bowlCount: bowls.length,
    perSession,
  };
}
