import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  computeStockSuggestion,
  type StockSuggestion,
  type UsageEvent,
} from "@/lib/reports/usageVelocity";
import type { Product } from "@/hooks/useProducts";

const WINDOW_DAYS = 90;
const PAGE = 1000;

/**
 * Smart Stock: consumption velocity per product from the last 90 days of
 * bowl history → days-until-out + suggested reorder/keep levels.
 */
export function useSmartStock(products: Product[]) {
  const queryClient = useQueryClient();

  const usageQuery = useQuery({
    queryKey: ["smart-stock-usage"],
    queryFn: async (): Promise<UsageEvent[]> => {
      const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();
      const all: UsageEvent[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from("bowl_items")
          .select("product_id, amount, unit, created_at")
          .gte("created_at", since)
          .range(from, from + PAGE - 1);
        if (error) throw error;
        all.push(...((data || []) as UsageEvent[]));
        if (!data || data.length < PAGE) break;
      }
      return all;
    },
    staleTime: 5 * 60 * 1000,
  });

  const suggestions = new Map<string, StockSuggestion>();
  if (usageQuery.data) {
    for (const p of products) {
      const s = computeStockSuggestion(
        {
          id: p.id,
          size: p.size,
          sizeUnit: p.sizeUnit,
          stock: p.stock,
          reorderLevel: p.reorderLevel,
          targetStock: p.targetStock,
        },
        usageQuery.data,
      );
      if (s) suggestions.set(p.id, s);
    }
  }

  const applySuggestion = useMutation({
    mutationFn: async ({
      productId,
      reorderLevel,
      targetStock,
    }: {
      productId: string;
      reorderLevel: number;
      targetStock: number;
    }) => {
      const { error } = await supabase
        .from("products")
        .update({ reorder_level: reorderLevel, target_stock: targetStock })
        .eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Stock levels updated");
    },
    onError: () => toast.error("Couldn't update stock levels"),
  });

  return { suggestions, isLoading: usageQuery.isLoading, applySuggestion };
}
