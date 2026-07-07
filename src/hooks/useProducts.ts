import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";
import { useTenant } from "@/contexts/TenantContext";
import { fetchAllRows } from "@/lib/reports/fetchAllRows";



type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type ProductType = Database["public"]["Enums"]["product_type"];

export interface Product {
  id: string;
  brand: string;
  line: string;
  shade: string;
  name: string;
  stock: number;
  reorderLevel: number;
  targetStock: number;
  status: "in-stock" | "low" | "out";
  type: string;
  size: number;
  sizeUnit: string;
  cost: number;
  isActive: boolean;
}

export interface ProductFormData {
  type: string;
  brand: string;
  line?: string;
  shade?: string;
  name: string;
  size: number;
  sizeUnit: string;
  cost: number;
  stock: number;
  reorderLevel: number;
  targetStock: number;
  status: "active" | "inactive";
}


// Map database row to UI Product
function mapRowToProduct(row: ProductRow): Product {
  const status: "in-stock" | "low" | "out" = 
    row.stock === 0 ? "out" : 
    row.stock <= row.reorder_level ? "low" : "in-stock";

  // Calculate tube/bottle price from cost_per_unit * size
  const tubePrice = (Number(row.cost_per_unit) || 0) * (row.size || 1);

  return {
    id: row.id,
    brand: row.brand,
    line: row.line || "",
    shade: row.shade || "",
    name: row.name,
    stock: row.stock,
    reorderLevel: row.reorder_level,
    targetStock: row.target_stock,
    status,
    type: row.type,
    size: row.size || 60,
    sizeUnit: row.size_unit || "ml",
    cost: tubePrice,
    isActive: row.is_active,
  };
}

export function useProducts() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const data = await fetchAllRows<ProductRow>((from, to) =>
        supabase
          .from("products")
          .select("*")
          .order("brand", { ascending: true })
          .order("name", { ascending: true })
          .range(from, to)
      );
      return data.map(mapRowToProduct);
    },
    staleTime: 30_000,
  });

  // Live updates: when any product row changes (cost, stock, etc.) in this
  // tenant, refresh the cache so Service Menu breakdowns, NewBowl previews,
  // and reorder screens reflect the new value without a reload.
  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel(`products-${tenantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products", filter: `tenant_id=eq.${tenantId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["products"] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);




  const createProduct = useMutation({
    mutationFn: async (formData: ProductFormData) => {
      // Calculate cost per ml/g from the tube/bottle price
      const costPerUnit = formData.size > 0 ? formData.cost / formData.size : 0;
      
      const { data, error } = await supabase
        .from("products")
        .insert({
          type: formData.type as ProductType,
          brand: formData.brand,
          line: formData.line || null,
          shade: formData.shade || null,
          name: formData.name,
          size: formData.size,
          size_unit: formData.sizeUnit || "ml",

          cost_per_unit: costPerUnit,
          stock: formData.stock,
          reorder_level: formData.reorderLevel,
          target_stock: formData.targetStock,
          is_active: formData.status === "active",
          tenant_id: tenantId,
        })
        .select()
        .single();

      if (error) throw error;
      return mapRowToProduct(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error) => {
      toast({
        title: "Error adding product",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: ProductFormData }) => {
      // Calculate cost per ml/g from the tube/bottle price
      const costPerUnit = formData.size > 0 ? formData.cost / formData.size : 0;
      
      const { data, error } = await supabase
        .from("products")
        .update({
          type: formData.type as ProductType,
          brand: formData.brand,
          line: formData.line || null,
          shade: formData.shade || null,
          name: formData.name,
          size: formData.size,
          size_unit: formData.sizeUnit || "ml",

          cost_per_unit: costPerUnit,
          stock: formData.stock,
          reorder_level: formData.reorderLevel,
          target_stock: formData.targetStock,
          is_active: formData.status === "active",
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return mapRowToProduct(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error) => {
      toast({
        title: "Error updating product",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error) => {
      toast({
        title: "Error deleting product",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createManyProducts = useMutation({
    mutationFn: async (products: ProductFormData[]) => {
      const productsToInsert = products.map(formData => {
        // Calculate cost per ml/g from the tube/bottle price
        const costPerUnit = formData.size > 0 ? formData.cost / formData.size : 0;
        
        return {
          type: formData.type as ProductType,
          brand: formData.brand,
          line: formData.line || null,
          shade: formData.shade || null,
          name: formData.name,
          size: formData.size,
          size_unit: formData.sizeUnit || "ml",
          cost_per_unit: costPerUnit,
          stock: formData.stock,
          reorder_level: formData.reorderLevel,
          target_stock: formData.targetStock,
          is_active: formData.status === "active",
          tenant_id: tenantId,
        };
      });

      const { data, error } = await supabase
        .from("products")
        .insert(productsToInsert)
        .select();

      if (error) throw error;
      return data.map(mapRowToProduct);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error) => {
      toast({
        title: "Error importing products",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Bulk delete - single query instead of sequential
  const deleteManyProducts = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("products")
        .delete()
        .in("id", ids);

      if (error) throw error;
      return ids.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: "Products deleted",
        description: `${count} products have been deleted.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting products",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Bulk update - single query with partial update
  const updateManyProducts = useMutation({
    mutationFn: async ({ 
      ids, 
      updates 
    }: { 
      ids: string[]; 
      updates: Partial<{
        stock: number;
        reorder_level: number;
        target_stock: number;
        cost_per_unit: number;
        is_active: boolean;
      }>;
    }) => {
      const { error } = await supabase
        .from("products")
        .update(updates)
        .in("id", ids);

      if (error) throw error;
      return ids.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: "Products updated",
        description: `${count} products have been updated.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating products",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    products,
    isLoading,
    error,
    createProduct,
    updateProduct,
    deleteProduct,
    createManyProducts,
    deleteManyProducts,
    updateManyProducts,
  };
}
