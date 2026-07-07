import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type ProductCatalog = Tables<"product_catalogs">;
type CatalogProduct = Tables<"catalog_products">;

// Fetch all catalogs (including inactive) for admin
export function useCatalogsAdmin() {
  return useQuery({
    queryKey: ["admin", "catalogs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_catalogs")
        .select("*")
        .order("brand", { ascending: true })
        .order("line", { ascending: true });

      if (error) throw error;
      return data as ProductCatalog[];
    },
  });
}

// Fetch all catalog products for admin
export function useCatalogProductsAdmin(catalogId?: string) {
  return useQuery({
    queryKey: ["admin", "catalog-products", catalogId],
    queryFn: async () => {
      let query = supabase
        .from("catalog_products")
        .select("*, product_catalogs(brand, line)")
        .order("name", { ascending: true });

      if (catalogId) {
        query = query.eq("catalog_id", catalogId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

// Fetch all products with catalog info for listing
export function useAllCatalogProducts() {
  return useQuery({
    queryKey: ["admin", "all-catalog-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalog_products")
        .select("*, product_catalogs(brand, line, is_active)")
        .order("name", { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}

// Create catalog
export function useCreateCatalog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (catalog: {
      brand: string;
      line: string;
      description?: string;
      logo_url?: string;
    }) => {
      const { data, error } = await supabase
        .from("product_catalogs")
        .insert({
          brand: catalog.brand,
          line: catalog.line,
          description: catalog.description || null,
          logo_url: catalog.logo_url || null,
          product_count: 0,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "catalogs"] });
      toast.success("Catalog created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create catalog: " + error.message);
    },
  });
}

// Update catalog
export function useUpdateCatalog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<ProductCatalog> & { id: string }) => {
      const { data, error } = await supabase
        .from("product_catalogs")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "catalogs"] });
      toast.success("Catalog updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update catalog: " + error.message);
    },
  });
}

// Soft-delete catalog (set is_active = false)
export function useDeleteCatalog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("product_catalogs")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "catalogs"] });
      toast.success("Catalog deactivated");
    },
    onError: (error) => {
      toast.error("Failed to deactivate catalog: " + error.message);
    },
  });
}

// Create catalog product
export function useCreateCatalogProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (product: {
      catalog_id: string;
      type: string;
      name: string;
      shade?: string;
      default_size?: number;
      default_size_unit?: string;
      suggested_cost_per_unit?: number;
    }) => {
      const { data, error } = await supabase
        .from("catalog_products")
        .insert({
          catalog_id: product.catalog_id,
          type: product.type,
          name: product.name,
          shade: product.shade || null,
          default_size: product.default_size || null,
          default_size_unit: product.default_size_unit || "ml",
          suggested_cost_per_unit: product.suggested_cost_per_unit || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "catalogs"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "catalog-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "all-catalog-products"] });
      toast.success("Product added successfully");
    },
    onError: (error) => {
      toast.error("Failed to add product: " + error.message);
    },
  });
}

// Update catalog product
export function useUpdateCatalogProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<CatalogProduct> & { id: string }) => {
      const { data, error } = await supabase
        .from("catalog_products")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "catalog-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "all-catalog-products"] });
      toast.success("Product updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update product: " + error.message);
    },
  });
}

// Delete catalog product
export function useDeleteCatalogProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("catalog_products")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "catalogs"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "catalog-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "all-catalog-products"] });
      toast.success("Product deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete product: " + error.message);
    },
  });
}

// Get import statistics
export function useImportStats() {
  return useQuery({
    queryKey: ["admin", "import-stats"],
    queryFn: async () => {
      // Get all catalog products with their catalog info
      const { data: catalogProducts, error: cpError } = await supabase
        .from("catalog_products")
        .select("id, name, shade, type, product_catalogs(brand, line)");

      if (cpError) throw cpError;

      // Get all tenant products to count imports
      const { data: products, error: pError } = await supabase
        .from("products")
        .select("brand, line, name, tenant_id");

      if (pError) throw pError;

      // Calculate stats for each catalog product
      const stats = catalogProducts?.map((cp) => {
        const catalog = cp.product_catalogs as { brand: string; line: string } | null;
        const matchingProducts = products?.filter(
          (p) =>
            p.brand === catalog?.brand &&
            p.line === catalog?.line &&
            p.name === cp.name
        ) || [];

        const uniqueTenants = new Set(matchingProducts.map((p) => p.tenant_id));

        return {
          id: cp.id,
          name: cp.name,
          shade: cp.shade,
          type: cp.type,
          brand: catalog?.brand || "",
          line: catalog?.line || "",
          tenant_count: uniqueTenants.size,
          total_imports: matchingProducts.length,
        };
      });

      // Sort by tenant count descending
      return stats?.sort((a, b) => b.tenant_count - a.tenant_count) || [];
    },
  });
}
