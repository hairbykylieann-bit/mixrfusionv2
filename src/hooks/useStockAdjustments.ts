import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useTenant } from "@/contexts/TenantContext";
import { useCurrentStaff } from "@/hooks/useCurrentStaff";

export type AdjustmentReason = 
  | "received_order" 
  | "service_usage" 
  | "manual_correction" 
  | "damaged" 
  | "returned"
  | "initial_stock";

export interface StockAdjustment {
  id: string;
  product_id: string;
  tenant_id: string | null;
  staff_id: string | null;
  previous_stock: number;
  new_stock: number;
  change_amount: number;
  reason: AdjustmentReason;
  notes: string | null;
  created_at: string;
  staff?: {
    name: string;
  } | null;
  product?: {
    brand: string;
    name: string;
    shade: string | null;
  } | null;
}

export function useStockAdjustments(productId?: string) {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  const { currentStaff } = useCurrentStaff();

  const { data: adjustments = [], isLoading } = useQuery({
    queryKey: ["stock-adjustments", productId],
    queryFn: async () => {
      if (!productId) return [];
      
      const { data, error } = await supabase
        .from("stock_adjustments")
        .select(`
          *,
          staff:staff_id (name)
        `)
        .eq("product_id", productId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as StockAdjustment[];
    },
    enabled: !!productId,
  });

  const createAdjustment = useMutation({
    mutationFn: async ({
      productId,
      previousStock,
      newStock,
      reason,
      notes,
    }: {
      productId: string;
      previousStock: number;
      newStock: number;
      reason: AdjustmentReason;
      notes?: string;
    }) => {
      const changeAmount = newStock - previousStock;
      
      // First update the product stock
      const { error: updateError } = await supabase
        .from("products")
        .update({ stock: newStock })
        .eq("id", productId);

      if (updateError) throw updateError;

      // Then create the adjustment record
      const { data, error } = await supabase
        .from("stock_adjustments")
        .insert({
          product_id: productId,
          tenant_id: tenantId,
          staff_id: currentStaff?.id || null,
          previous_stock: previousStock,
          new_stock: newStock,
          change_amount: changeAmount,
          reason,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["stock-adjustments", variables.productId] });
      queryClient.invalidateQueries({ queryKey: ["stock-adjustments-all"] });
      toast({
        title: "Stock updated",
        description: "Inventory has been adjusted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating stock",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    adjustments,
    isLoading,
    createAdjustment,
  };
}

export function useAllStockAdjustments() {
  const { tenantId } = useTenant();

  const { data: adjustments = [], isLoading } = useQuery({
    queryKey: ["stock-adjustments-all", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from("stock_adjustments")
        .select(`
          *,
          staff:staff_id (name),
          product:product_id (brand, name, shade)
        `)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      return data as StockAdjustment[];
    },
    enabled: !!tenantId,
  });

  return { adjustments, isLoading };
}
