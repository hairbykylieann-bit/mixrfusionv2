import type { Tables } from "@/integrations/supabase/types";
import { extractTone, extractLevel, TONE_FAMILIES, getToneFamilyName } from "./inventoryUtils";

type CatalogProduct = Tables<"catalog_products">;

/**
 * Group catalog products by tone family for organized display
 */
export interface CatalogToneGroup {
  tone: string;
  name: string;
  products: CatalogProduct[];
}

/**
 * Group catalog products by type for non-color products
 */
export interface CatalogTypeGroup {
  type: string;
  products: CatalogProduct[];
}

/**
 * Group color products by their tone family
 */
export function groupCatalogProductsByTone(products: CatalogProduct[]): CatalogToneGroup[] {
  const colorProducts = products.filter((p) => p.type.toLowerCase() === "color");
  const grouped: Record<string, CatalogProduct[]> = {};

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

  // Sort tone groups by predefined order
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
 * Group non-color products by their type
 */
export function groupCatalogNonColorProducts(products: CatalogProduct[]): CatalogTypeGroup[] {
  const nonColor = products.filter((p) => p.type.toLowerCase() !== "color");
  const grouped: Record<string, CatalogProduct[]> = {};

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

/**
 * Get summary stats for catalog products
 */
export function getCatalogProductStats(products: CatalogProduct[]) {
  const colorCount = products.filter((p) => p.type.toLowerCase() === "color").length;
  const developerCount = products.filter((p) => p.type.toLowerCase() === "developer").length;
  const lightenerCount = products.filter((p) => p.type.toLowerCase() === "lightener").length;
  const treatmentCount = products.filter((p) => p.type.toLowerCase() === "treatment").length;

  return {
    total: products.length,
    colorCount,
    developerCount,
    lightenerCount,
    treatmentCount,
  };
}

// Re-export tone utilities for convenience
export { extractTone, extractLevel, getToneFamilyName, TONE_FAMILIES };
