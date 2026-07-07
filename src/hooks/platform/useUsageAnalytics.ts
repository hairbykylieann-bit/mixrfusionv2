import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UsageDaily {
  id: string;
  tenant_id: string;
  date: string;
  color_sessions_count: number;
  bowls_count: number;
  clients_added_count: number;
  products_used_count: number;
  created_at: string;
}

export interface UsageSummary {
  total_sessions: number;
  total_bowls: number;
  total_clients: number;
  total_products: number;
  days_active: number;
}

interface UseUsageAnalyticsOptions {
  tenantId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export function useUsageAnalytics(options: UseUsageAnalyticsOptions = {}) {
  const { tenantId, startDate, endDate, limit = 30 } = options;

  return useQuery({
    queryKey: ["platform", "usage-analytics", { tenantId, startDate, endDate, limit }],
    queryFn: async (): Promise<UsageDaily[]> => {
      let query = supabase
        .from("usage_daily")
        .select("*")
        .order("date", { ascending: false })
        .limit(limit);

      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      }

      if (startDate) {
        query = query.gte("date", startDate.toISOString().split("T")[0]);
      }

      if (endDate) {
        query = query.lte("date", endDate.toISOString().split("T")[0]);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data as UsageDaily[];
    },
  });
}

export function useUsageSummary(tenantId?: string, days: number = 30) {
  return useQuery({
    queryKey: ["platform", "usage-summary", tenantId, days],
    queryFn: async (): Promise<UsageSummary> => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let query = supabase
        .from("usage_daily")
        .select("*")
        .gte("date", startDate.toISOString().split("T")[0]);

      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const usage = data || [];

      return {
        total_sessions: usage.reduce((sum, u) => sum + (u.color_sessions_count || 0), 0),
        total_bowls: usage.reduce((sum, u) => sum + (u.bowls_count || 0), 0),
        total_clients: usage.reduce((sum, u) => sum + (u.clients_added_count || 0), 0),
        total_products: usage.reduce((sum, u) => sum + (u.products_used_count || 0), 0),
        days_active: usage.length,
      };
    },
  });
}

export function usePlatformUsageTotals() {
  return useQuery({
    queryKey: ["platform", "usage-totals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usage_daily")
        .select("tenant_id, color_sessions_count, bowls_count, clients_added_count, products_used_count");

      if (error) throw error;

      const usage = data || [];
      const tenantIds = new Set(usage.map((u) => u.tenant_id));

      return {
        total_sessions: usage.reduce((sum, u) => sum + (u.color_sessions_count || 0), 0),
        total_bowls: usage.reduce((sum, u) => sum + (u.bowls_count || 0), 0),
        total_clients: usage.reduce((sum, u) => sum + (u.clients_added_count || 0), 0),
        total_products: usage.reduce((sum, u) => sum + (u.products_used_count || 0), 0),
        active_tenants: tenantIds.size,
      };
    },
  });
}
