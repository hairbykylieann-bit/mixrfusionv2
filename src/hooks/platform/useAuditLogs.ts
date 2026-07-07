import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AuditLog {
  id: string;
  action: string;
  actor_type: "platform_admin" | "tenant_user";
  actor_user_id: string;
  tenant_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  tenant_name?: string | null;
  actor_email?: string | null;
}

interface UseAuditLogsOptions {
  tenantId?: string;
  actorType?: "platform_admin" | "tenant_user";
  limit?: number;
  offset?: number;
}

export function useAuditLogs(options: UseAuditLogsOptions = {}) {
  const { tenantId, actorType, limit = 50, offset = 0 } = options;

  return useQuery({
    queryKey: ["platform", "audit-logs", { tenantId, actorType, limit, offset }],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select(`
          *,
          tenants:tenant_id (name)
        `)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      }

      if (actorType) {
        query = query.eq("actor_type", actorType);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((log) => ({
        ...log,
        tenant_name: (log.tenants as { name: string } | null)?.name || null,
        actor_email: null, // Profile lookup not available via join
      })) as AuditLog[];
    },
  });
}

export function useAuditLogsCount(tenantId?: string) {
  return useQuery({
    queryKey: ["platform", "audit-logs-count", tenantId],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
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
