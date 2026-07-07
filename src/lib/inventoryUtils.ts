import type { Product } from "@/hooks/useProducts";

/**
 * Extract level from shade codes like "07CB", "7N", "10SM"
 * Returns null for non-color products or unparseable shades
 */
export function extractLevel(shade: string | null | undefined): number | null {
  if (!shade) return null;
  
  // Match leading digits (with optional leading zero)
  const match = shade.match(/^0?(\d{1,2})/);
  if (match) {
    const level = parseInt(match[1], 10);
    return level >= 1 && level <= 12 ? level : null;
  }
  return null;
}

/**
 * Extract tone family from shade codes like "07CB", "7N", "10SM"
 * Returns the letter(s) after the level number
 */
export function extractTone(shade: string | null | undefined): string | null {
  if (!shade) return null;
  
  // Match letters after the leading digits
  const match = shade.match(/^\d+([A-Z]+)/i);
  return match ? match[1].toUpperCase() : null;
}

/**
 * Industry-standard tone families with display names
 */
export const TONE_FAMILIES: Record<string, { name: string; order: number }> = {
  N: { name: "Naturals", order: 1 },
  A: { name: "Ash", order: 2 },
  B: { name: "Beige/Brown", order: 3 },
  G: { name: "Gold", order: 4 },
  C: { name: "Copper", order: 5 },
  R: { name: "Red", order: 6 },
  RR: { name: "Red Red", order: 7 },
  RV: { name: "Red-Violet", order: 8 },
  V: { name: "Violet", order: 9 },
  VR: { name: "Violet-Red", order: 10 },
  NB: { name: "Natural Brown", order: 11 },
  NW: { name: "Natural Warm", order: 12 },
  WB: { name: "Warm Brown", order: 13 },
  GB: { name: "Gold Brown", order: 14 },
  GN: { name: "Gold Natural", order: 15 },
  CB: { name: "Copper Brown", order: 16 },
  VB: { name: "Violet Brown", order: 17 },
  SM: { name: "Silver Metallics", order: 18 },
  P: { name: "Pastel", order: 19 },
};

/**
 * Get display name for a tone code
 */
export function getToneFamilyName(toneCode: string | null): string {
  if (!toneCode) return "Unknown";
  return TONE_FAMILIES[toneCode]?.name || toneCode;
}

/**
 * Count products by individual level (1-12)
 */
export function countByLevel(products: Product[]): Record<number, number> {
  const counts: Record<number, number> = {};
  products.forEach((p) => {
    const level = extractLevel(p.shade);
    if (level !== null) {
      counts[level] = (counts[level] || 0) + 1;
    }
  });
  return counts;
}

/**
 * Get unique levels present in products, sorted ascending
 */
export function getUniqueLevels(products: Product[]): number[] {
  const levels = new Set<number>();
  products.forEach((p) => {
    const level = extractLevel(p.shade);
    if (level !== null) levels.add(level);
  });
  return Array.from(levels).sort((a, b) => a - b);
}

export interface InventoryFilters {
  brand: string | null;
  line: string | null;
  type: string | null;
  level: number | null;
  tone: string | null;
}

export const defaultInventoryFilters: InventoryFilters = {
  brand: null,
  line: null,
  type: null,
  level: null,
  tone: null,
};

/**
 * Count products by a specific field value
 */
export function countByField(
  products: Product[],
  field: keyof Pick<Product, "brand" | "line" | "type">
): Record<string, number> {
  const counts: Record<string, number> = {};
  products.forEach((p) => {
    const value = p[field];
    if (value) {
      counts[value] = (counts[value] || 0) + 1;
    }
  });
  return counts;
}

/**
 * Count products by tone family
 */
export function countByTone(products: Product[]): Record<string, number> {
  const counts: Record<string, number> = {};
  
  products.forEach((p) => {
    if (p.type !== "Color") return;
    const tone = extractTone(p.shade);
    if (tone) {
      counts[tone] = (counts[tone] || 0) + 1;
    }
  });
  
  return counts;
}

// countByLevelRange removed - replaced by countByLevel above

/**
 * Get unique values for a field from products
 */
export function getUniqueValues(
  products: Product[],
  field: keyof Pick<Product, "brand" | "line" | "type">
): string[] {
  const values = new Set<string>();
  products.forEach((p) => {
    const value = p[field];
    if (value) values.add(value);
  });
  return Array.from(values).sort();
}

/**
 * Get unique tone codes from color products
 */
export function getUniqueTones(products: Product[]): string[] {
  const tones = new Set<string>();
  products.forEach((p) => {
    if (p.type !== "Color") return;
    const tone = extractTone(p.shade);
    if (tone) tones.add(tone);
  });
  
  // Sort by the predefined order, then alphabetically for unknown tones
  return Array.from(tones).sort((a, b) => {
    const orderA = TONE_FAMILIES[a]?.order ?? 999;
    const orderB = TONE_FAMILIES[b]?.order ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    return a.localeCompare(b);
  });
}

/**
 * Apply all filters to products
 */
export function applyInventoryFilters(
  products: Product[],
  filters: InventoryFilters
): Product[] {
  return products.filter((p) => {
    if (filters.brand && p.brand !== filters.brand) return false;
    if (filters.line && p.line !== filters.line) return false;
    if (filters.type && p.type !== filters.type) return false;
    if (filters.tone) {
      const productTone = extractTone(p.shade);
      if (productTone !== filters.tone) return false;
    }
    if (filters.level !== null) {
      const level = extractLevel(p.shade);
      if (level !== filters.level) return false;
    }
    return true;
  });
}

/**
 * Group products by tone family for display
 */
export interface ToneGroup {
  tone: string;
  name: string;
  products: Product[];
}

export function groupProductsByTone(products: Product[]): ToneGroup[] {
  const colorProducts = products.filter((p) => p.type === "Color");
  const grouped: Record<string, Product[]> = {};
  
  colorProducts.forEach((p) => {
    const tone = extractTone(p.shade) || "Other";
    if (!grouped[tone]) grouped[tone] = [];
    grouped[tone].push(p);
  });
  
  // Sort products within each group by level
  Object.values(grouped).forEach((group) => {
    group.sort((a, b) => {
      const levelA = extractLevel(a.shade) ?? 99;
      const levelB = extractLevel(b.shade) ?? 99;
      return levelA - levelB;
    });
  });
  
  // Convert to array and sort by tone order
  const toneOrder = Object.keys(grouped).sort((a, b) => {
    const orderA = TONE_FAMILIES[a]?.order ?? 999;
    const orderB = TONE_FAMILIES[b]?.order ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    return a.localeCompare(b);
  });
  
  return toneOrder.map((tone) => ({
    tone,
    name: getToneFamilyName(tone),
    products: grouped[tone],
  }));
}

/**
 * Group color products by level for display
 */
export interface LevelGroup {
  level: number;
  name: string;
  products: Product[];
}

export function groupProductsByLevel(products: Product[]): LevelGroup[] {
  const colorProducts = products.filter((p) => p.type === "Color");
  const grouped: Record<number, Product[]> = {};

  colorProducts.forEach((p) => {
    const level = extractLevel(p.shade);
    if (level !== null) {
      if (!grouped[level]) grouped[level] = [];
      grouped[level].push(p);
    }
  });

  // Sort products within each level by tone alphabetically
  Object.values(grouped).forEach((group) => {
    group.sort((a, b) => {
      const toneA = extractTone(a.shade) || "";
      const toneB = extractTone(b.shade) || "";
      return toneA.localeCompare(toneB);
    });
  });

  // Sort levels ascending
  const sortedLevels = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => a - b);

  return sortedLevels.map((level) => ({
    level,
    name: `Level ${level}`,
    products: grouped[level],
  }));
}

/**
 * Group all products by stock status for display
 */
export interface StatusGroup {
  status: "in-stock" | "low" | "out";
  label: string;
  products: Product[];
}

export function groupProductsByStatus(products: Product[]): StatusGroup[] {
  const groups: Record<string, Product[]> = {
    "in-stock": [],
    "low": [],
    "out": [],
  };

  products.forEach((p) => {
    groups[p.status]?.push(p);
  });

  // Sort within each group by name
  Object.values(groups).forEach((g) => g.sort((a, b) => a.name.localeCompare(b.name)));

  const labels: Record<string, string> = {
    "in-stock": "In Stock",
    "low": "Low Stock",
    "out": "Out of Stock",
  };

  return (["in-stock", "low", "out"] as const)
    .filter((s) => groups[s].length > 0)
    .map((s) => ({ status: s, label: labels[s], products: groups[s] }));
}

/**
 * Group non-color products by type for display
 */
export interface TypeGroup {
  type: string;
  products: Product[];
}

export function groupNonColorProducts(products: Product[]): TypeGroup[] {
  const nonColor = products.filter((p) => p.type !== "Color");
  const grouped: Record<string, Product[]> = {};
  
  nonColor.forEach((p) => {
    if (!grouped[p.type]) grouped[p.type] = [];
    grouped[p.type].push(p);
  });
  
  // Sort products within each group by name
  Object.values(grouped).forEach((group) => {
    group.sort((a, b) => a.name.localeCompare(b.name));
  });
  
  const typeOrder = ["Developer", "Lightener", "Treatment"];
  const sortedTypes = Object.keys(grouped).sort((a, b) => {
    const indexA = typeOrder.indexOf(a);
    const indexB = typeOrder.indexOf(b);
    if (indexA >= 0 && indexB >= 0) return indexA - indexB;
    if (indexA >= 0) return -1;
    if (indexB >= 0) return 1;
    return a.localeCompare(b);
  });
  
  return sortedTypes.map((type) => ({
    type,
    products: grouped[type],
  }));
}
