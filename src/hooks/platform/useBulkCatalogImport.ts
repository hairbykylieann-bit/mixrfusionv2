import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ParsedProduct {
  type: string;
  name: string;
  shade?: string;
  default_size?: number;
  default_size_unit?: string;
  suggested_cost_per_unit?: number;
}

export interface ImportResult {
  total: number;
  success: number;
  errors: { row: number; message: string }[];
}

// Type normalization map - standardize to capitalized format
const TYPE_MAP: Record<string, string> = {
  color: "Color",
  developer: "Developer",
  lightener: "Lightener",
  treatment: "Treatment",
  toner: "Toner",
  additive: "Additive",
};

// Parse CSV/TSV data into product objects
export function parseCSV(text: string, delimiter: string = ","): ParsedProduct[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(delimiter).map((h) => h.trim().toLowerCase());
  const products: ParsedProduct[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map((v) => v.trim());
    if (values.length === 0 || (values.length === 1 && values[0] === "")) continue;

    const product: ParsedProduct = {
      type: "",
      name: "",
    };

    headers.forEach((header, index) => {
      const value = values[index] || "";
      switch (header) {
        case "type":
          // Normalize to capitalized format for consistency
          product.type = TYPE_MAP[value.toLowerCase()] || value;
          break;
        case "name":
          product.name = value;
          break;
        case "shade":
          product.shade = value || undefined;
          break;
        case "default_size":
        case "size":
          product.default_size = value ? parseFloat(value) : undefined;
          break;
        case "default_size_unit":
        case "unit":
          product.default_size_unit = value || undefined;
          break;
        case "suggested_cost_per_unit":
        case "cost":
        case "cost_per_unit":
          product.suggested_cost_per_unit = value ? parseFloat(value) : undefined;
          break;
      }
    });

    if (product.type && product.name) {
      products.push(product);
    }
  }

  return products;
}

// Validate products before import
export function validateProducts(products: ParsedProduct[]): { valid: ParsedProduct[]; errors: { row: number; message: string }[] } {
  const validTypes = ["color", "developer", "lightener", "treatment", "toner", "additive"];
  const valid: ParsedProduct[] = [];
  const errors: { row: number; message: string }[] = [];

  products.forEach((product, index) => {
    const rowNum = index + 2; // +2 for header row and 0-indexing

    if (!product.type) {
      errors.push({ row: rowNum, message: "Missing type" });
      return;
    }

    // Validate case-insensitively
    if (!validTypes.includes(product.type.toLowerCase())) {
      errors.push({ row: rowNum, message: `Invalid type: ${product.type}. Must be one of: ${validTypes.join(", ")}` });
      return;
    }

    if (!product.name) {
      errors.push({ row: rowNum, message: "Missing name" });
      return;
    }

    // Keep the already-normalized capitalized type from parseCSV
    valid.push(product);
  });

  return { valid, errors };
}

// Bulk import products mutation
export function useBulkImportProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      catalogId,
      products,
    }: {
      catalogId: string;
      products: ParsedProduct[];
    }): Promise<ImportResult> => {
      const { valid, errors } = validateProducts(products);

      if (valid.length === 0) {
        return {
          total: products.length,
          success: 0,
          errors: errors.length > 0 ? errors : [{ row: 0, message: "No valid products to import" }],
        };
      }

      const insertData = valid.map((p) => ({
        catalog_id: catalogId,
        type: p.type,
        name: p.name,
        shade: p.shade || null,
        default_size: p.default_size || null,
        default_size_unit: p.default_size_unit || "ml",
        suggested_cost_per_unit: p.suggested_cost_per_unit || 0,
      }));

      const { data, error } = await supabase
        .from("catalog_products")
        .insert(insertData)
        .select();

      if (error) {
        throw error;
      }

      return {
        total: products.length,
        success: data?.length || 0,
        errors,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "catalogs"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "catalog-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "all-catalog-products"] });

      if (result.errors.length > 0) {
        toast.warning(`Imported ${result.success} of ${result.total} products. ${result.errors.length} rows had errors.`);
      } else {
        toast.success(`Successfully imported ${result.success} products`);
      }
    },
    onError: (error) => {
      toast.error("Failed to import products: " + error.message);
    },
  });
}

// Generate CSV template
export function generateCSVTemplate(): string {
  return `type,name,shade,default_size,default_size_unit,suggested_cost_per_unit
color,Permanent Color,6N,60,ml,10.80
color,Permanent Color,7N,60,ml,10.80
developer,20 Volume Developer,,946,ml,18.99
lightener,Powder Lightener,,454,g,22.50`;
}
