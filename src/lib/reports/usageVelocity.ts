// ============================================================================
// SMART STOCK — consumption-velocity math.
// "You use ~2 tubes of 6N a week, you have 3 left → ~10 days until out.
//  Keep 8 on hand, reorder at 4."
//
// Pure functions — no queries here. Fed by bowl_items usage history.
// All conversions go through the canonical unit module.
// ============================================================================

import { convertToGrams, getBottleSizeInGrams } from "@/lib/units";

/** Tuning knobs (weeks of coverage). Change here, not inline. */
export const TARGET_COVER_WEEKS = 4;   // "keep this much on hand"
export const REORDER_COVER_WEEKS = 2;  // "reorder when you're down to this"
export const MIN_DATA_DAYS = 14;       // need 2+ weeks of history
export const MIN_USAGE_EVENTS = 3;     // and at least 3 real uses

export interface UsageEvent {
  product_id: string;
  amount: number;
  unit: string;
  created_at: string;
}

export interface VelocityProductInput {
  id: string;
  size: number;        // container size
  sizeUnit: string;    // container size unit
  stock: number;       // containers on hand
  reorderLevel: number;
  targetStock: number;
}

export interface StockSuggestion {
  productId: string;
  containersPerWeek: number;
  daysUntilOut: number | null; // null = not depleting (no recent usage)
  dataDays: number;            // how much history informed this
  usageEvents: number;
  suggestedReorderLevel: number;
  suggestedTargetStock: number;
  /** true when suggestion meaningfully differs from current settings */
  differsFromCurrent: boolean;
}

export function computeStockSuggestion(
  product: VelocityProductInput,
  events: UsageEvent[],
  now: Date = new Date(),
): StockSuggestion | null {
  const containerGrams = getBottleSizeInGrams(product.size, product.sizeUnit);
  if (!containerGrams || containerGrams <= 0) return null;

  const mine = events.filter((e) => e.product_id === product.id);
  if (mine.length < MIN_USAGE_EVENTS) return null;

  const earliest = mine.reduce(
    (min, e) => Math.min(min, new Date(e.created_at).getTime()),
    Infinity,
  );
  const dataDays = Math.max(1, (now.getTime() - earliest) / 86_400_000);
  if (dataDays < MIN_DATA_DAYS) return null;

  const gramsUsed = mine.reduce(
    (sum, e) => sum + convertToGrams(Number(e.amount) || 0, e.unit || "g"),
    0,
  );
  const containersUsed = gramsUsed / containerGrams;
  const containersPerWeek = (containersUsed / dataDays) * 7;
  if (containersPerWeek <= 0) return null;

  const perDay = containersPerWeek / 7;
  const daysUntilOut = product.stock > 0 ? product.stock / perDay : 0;

  const suggestedReorderLevel = Math.max(
    Math.ceil(containersPerWeek * REORDER_COVER_WEEKS),
    1,
  );
  const suggestedTargetStock = Math.max(
    Math.ceil(containersPerWeek * TARGET_COVER_WEEKS),
    suggestedReorderLevel + 1,
  );

  const differsFromCurrent =
    suggestedReorderLevel !== product.reorderLevel ||
    suggestedTargetStock !== product.targetStock;

  return {
    productId: product.id,
    containersPerWeek: Math.round(containersPerWeek * 100) / 100,
    daysUntilOut: daysUntilOut === null ? null : Math.round(daysUntilOut),
    dataDays: Math.round(dataDays),
    usageEvents: mine.length,
    suggestedReorderLevel,
    suggestedTargetStock,
    differsFromCurrent,
  };
}

/** Human line: "~2.1 tubes/wk · ~10 days left" */
export function describeVelocity(s: StockSuggestion, containerWord = "tubes"): string {
  const rate = `~${s.containersPerWeek} ${containerWord}/wk`;
  if (s.daysUntilOut === null) return rate;
  if (s.daysUntilOut <= 0) return `${rate} · out now`;
  return `${rate} · ~${s.daysUntilOut} day${s.daysUntilOut === 1 ? "" : "s"} left`;
}
