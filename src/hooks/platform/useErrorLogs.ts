import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ErrorLog {
  id: string;
  error_message: string;
  error_stack: string | null;
  component_stack: string | null;
  user_id: string | null;
  tenant_id: string | null;
  url: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  tenant_name?: string;
}

interface UseErrorLogsOptions {
  tenantId?: string;
  limit?: number;
  offset?: number;
  includeSystemLogs?: boolean;
}

export function useErrorLogs(options: UseErrorLogsOptions = {}) {
  const { tenantId, limit = 50, offset = 0, includeSystemLogs = false } = options;

  return useQuery({
    queryKey: ["platform", "error-logs", { tenantId, limit, offset, includeSystemLogs }],
    queryFn: async () => {
      let query = supabase
        .from("error_logs")
        .select(`
          *,
          tenants:tenant_id (name)
        `)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      }

      // Filter out system/health check logs by default
      if (!includeSystemLogs) {
        query = query.neq("error_message", "health-check-ping");
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((log) => ({
        ...log,
        tenant_name: (log.tenants as { name: string } | null)?.name || null,
      })) as ErrorLog[];
    },
  });
}

export function useErrorLogsCount(tenantId?: string) {
  return useQuery({
    queryKey: ["platform", "error-logs-count", tenantId],
    queryFn: async () => {
      let query = supabase
        .from("error_logs")
        .select("id", { count: "exact", head: true });

      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      }

      const { count, error } = await query;

      if (error) throw error;

      return count || 0;
    },
  });
}

export function useRecentErrors(limit = 5) {
  return useQuery({
    queryKey: ["platform", "recent-errors", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("error_logs")
        .select(`
          id,
          error_message,
          created_at,
          tenant_id,
          tenants:tenant_id (name)
        `)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((log) => ({
        ...log,
        tenant_name: (log.tenants as { name: string } | null)?.name || null,
      }));
    },
  });
}
