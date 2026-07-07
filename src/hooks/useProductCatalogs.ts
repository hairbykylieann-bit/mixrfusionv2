import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProductCatalog {
  id: string;
  brand: string;
  line: string;
  description: string | null;
  product_count: number;
  logo_url: string | null;
  is_active: boolean;
}

export interface CatalogProduct {
  id: string;
  catalog_id: string;
  type: string;
  shade: string | null;
  name: string;
  default_size: number | null;
  default_size_unit: string | null;
  suggested_cost_per_unit: number | null;
}

export function useProductCatalogs() {
  return useQuery({
    queryKey: ["product-catalogs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_catalogs")
        .select("*")
        .eq("is_active", true)
        .order("brand", { ascending: true });

      if (error) throw error;
      return data as ProductCatalog[];
    },
  });
}

export function useCatalogProducts(catalogId: string | null) {
  return useQuery({
    queryKey: ["catalog-products", catalogId],
    queryFn: async () => {
      if (!catalogId) return [];
      
      const { data, error } = await supabase
        .from("catalog_products")
        .select("*")
        .eq("catalog_id", catalogId)
        .order("name", { ascending: true });

      if (error) throw error;
      return data as CatalogProduct[];
    },
    enabled: !!catalogId,
  });
}

export function useImportCatalogProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productIds,
      defaultStock = 0,
      pricing,
    }: {
      productIds: string[];
      defaultStock?: number;
      pricing: Record<string, number>; // catalog_id:type -> cost per container
    }) => {
      const { data, error } = await supabase.functions.invoke("catalog-import", {
        body: {
          catalog_product_ids: productIds,
          default_stock: defaultStock,
          pricing,
        },
      });

      if (error) {
        // Supabase returns a generic message for non-2xx responses; try to extract the
        // real backend error JSON so the UI shows something actionable.
        const anyErr = error as unknown as { message?: string; context?: Response };
        const ctx = anyErr?.context;
        if (ctx) {
          try {
            const text = await ctx.text();
            try {
              const json = JSON.parse(text);
              throw new Error(json?.error || anyErr.message || "Import failed");
            } catch {
              throw new Error(text || anyErr.message || "Import failed");
            }
          } catch {
            // fall through to generic
          }
        }

        throw error;
      }
      if (data.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(`Successfully imported ${data.imported_count} products`);
    },
    onError: (error: Error) => {
      toast.error(`Import failed: ${error.message}`);
    },
  });
}
