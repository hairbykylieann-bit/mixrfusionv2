/**
 * Single source of truth for choosing the product-charge multiplier.
 *
 * Hierarchy (never combined, never added):
 *   1. Stylist custom multiplier — if the override is ON and a valid positive number
 *   2. Otherwise the salon default multiplier
 *   3. Last resort (salon default missing entirely): SAFE_DEFAULT, never 1x, never 0
 *
 * Robust to null / undefined / blank / zero / string values, which were the
 * cause of wrong (and $0) charges: e.g. an override flag left on with a 0 or
 * empty value used to zero out the charge; a string "3" from a form could slip
 * through. Everything is coerced and validated here.
 */

const SAFE_DEFAULT = 2; // used ONLY if the salon default is also missing/invalid

export interface StaffMarkupLike {
  has_custom_markup?: boolean | null;
  custom_markup_percent?: number | string | null; // stores a MULTIPLIER (3 = 3x)
}

/** Coerce to a positive finite number, else null. Handles "3", 3, "", null, 0, NaN. */
function toPositiveNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "string" ? parseFloat(value) : Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function resolveEffectiveMultiplier(
  staffMarkup: StaffMarkupLike | null | undefined,
  salonDefaultMultiplier: number | string | null | undefined,
): number {
  const custom = toPositiveNumber(staffMarkup?.custom_markup_percent);
  // Override wins ONLY when explicitly enabled AND the value is valid.
  if (staffMarkup?.has_custom_markup === true && custom !== null) {
    return custom;
  }
  const salon = toPositiveNumber(salonDefaultMultiplier);
  if (salon !== null) return salon;
  return SAFE_DEFAULT;
}

/** productCost × effectiveMultiplier, rounded to cents. (Waste/bowl fee handled elsewhere.) */
export function productChargeBase(productCost: number, effectiveMultiplier: number): number {
  const raw = (Number(productCost) || 0) * effectiveMultiplier;
  return Math.round(raw * 100) / 100;
}
