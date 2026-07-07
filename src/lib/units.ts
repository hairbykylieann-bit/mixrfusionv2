// ============================================================================
// CANONICAL UNIT SYSTEM — single source of truth for ALL unit conversion.
//
// RULES (do not change without updating the Math Decision note in the vault):
// 1. Grams are the canonical unit. Everything converts through grams.
// 2. 1 oz = 28.3495 g — the WEIGHT ounce. Color is weighed on a scale, so
//    weight ounces are always correct for product amounts. (The old code mixed
//    weight ounces and fluid ounces (29.5735 ml), which made the same bowl
//    cost different amounts depending on which code path computed it.)
// 3. g ≈ ml for hair products (documented approximation, density ~1).
// 4. Conversions are TRANSITIVE: oz→L gives the same answer as oz→g→L,
//    because every conversion goes through a single factor table.
// 5. The database function `calculate_bowl_item_cost` MUST use these same
//    factors. If you change this table, ship a matching SQL migration.
//
// Never re-implement conversion math in a component, hook, report, or test.
// Import from here.
// ============================================================================

export type UnitOption = { value: string; label: string };

export const CONTAINER_UNIT_OPTIONS: UnitOption[] = [
  { value: 'ml', label: 'ml' },
  { value: 'g',  label: 'g' },
  { value: 'oz', label: 'oz' },
  { value: 'L',  label: 'L (liter)' },
  { value: 'gal', label: 'gal' },
];

export const GRAMS_PER_OZ = 28.3495;

/** How many grams one unit of `unit` is worth (g ≈ ml for hair products). */
export function toGramsFactor(unit: string): number {
  switch (unit) {
    case 'g': case 'ml': return 1;
    case 'oz': return GRAMS_PER_OZ;
    case 'L': case 'l': case 'liter': return 1000;
    case 'kg': return 1000;
    case 'lb': return 453.592;
    case 'gal': case 'gallon': return 3785.41;
    default: return 1;
  }
}

/**
 * @deprecated Use toGramsFactor. Kept so old imports don't break; same table
 * (g ≈ ml), so values are identical.
 */
export function toMlFactor(unit: string): number {
  return toGramsFactor(unit);
}

/** Convert `amount` from one unit into another. Path-independent. */
export function convertAmountBetweenUnits(
  amount: number,
  fromUnit: string,
  toUnit: string,
): number {
  if (fromUnit === toUnit) return amount;
  const toFactor = toGramsFactor(toUnit);
  if (toFactor <= 0) return amount;
  return (amount * toGramsFactor(fromUnit)) / toFactor;
}

/** Amount in grams. */
export function convertToGrams(amount: number, unit: string): number {
  return convertAmountBetweenUnits(amount, unit, 'g');
}

/** Convert grams to the salon's preferred display unit. */
export function convertGramsToDisplayUnit(grams: number, displayUnit: string): number {
  return convertAmountBetweenUnits(grams, 'g', displayUnit);
}

/** Unit label string for display. */
export function getUnitLabel(displayUnit: string): string {
  return displayUnit === 'oz' ? 'oz' : 'g';
}

/** Container size expressed in grams (for cost-per-gram math). */
export function getBottleSizeInGrams(size: number, sizeUnit: string): number {
  return convertToGrams(size, sizeUnit);
}
