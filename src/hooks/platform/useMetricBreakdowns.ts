import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TenantBreakdown {
  tenantId: string;
  tenantName: string;
  count: number;
}

export interface SessionBreakdown {
  id: string;
  tenantId: string;
  tenantName: string;
  clientName: string;
  sessionDate: string;
  stylistName: string | null;
}

export function useStaffBreakdown() {
  return useQuery({
    queryKey: ["platform-staff-breakdown"],
    queryFn: async (): Promise<TenantBreakdown[]> => {
      const { data: tenants } = await supabase
        .from("tenants")
        .select("id, name");

      const { data: staff } = await supabase
        .from("staff")
        .select("id, tenant_id");

      if (!tenants || !staff) return [];

      const breakdown = tenants.map(tenant => ({
        tenantId: tenant.id,
        tenantName: tenant.name,
        count: staff.filter(s => s.tenant_id === tenant.id).length,
      }));

      return breakdown.sort((a, b) => b.count - a.count);
    },
  });
}

export function useClientsBreakdown() {
  return useQuery({
    queryKey: ["platform-clients-breakdown"],
    queryFn: async (): Promise<TenantBreakdown[]> => {
      const { data: tenants } = await supabase
        .from("tenants")
        .select("id, name");

      const { data: clients } = await supabase
        .from("clients")
        .select("id, tenant_id");

      if (!tenants || !clients) return [];

      const breakdown = tenants.map(tenant => ({
        tenantId: tenant.id,
        tenantName: tenant.name,
        count: clients.filter(c => c.tenant_id === tenant.id).length,
      }));

      return breakdown.sort((a, b) => b.count - a.count);
    },
  });
}

export function useSessionsBreakdown() {
  return useQuery({
    queryKey: ["platform-sessions-breakdown"],
    queryFn: async (): Promise<SessionBreakdown[]> => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: tenants } = await supabase
        .from("tenants")
        .select("id, name");

      const { data: sessions } = await supabase
        .from("color_sessions")
        .select(`
          id,
          tenant_id,
          session_date,
          client_id,
          stylist_id,
          clients (name),
          staff (name)
        `)
        .gte("session_date", thirtyDaysAgo.toISOString().split("T")[0])
        .order("session_date", { ascending: false })
        .limit(50);

      if (!tenants || !sessions) return [];

      const tenantMap = new Map(tenants.map(t => [t.id, t.name]));

      return sessions.map(session => ({
        id: session.id,
        tenantId: session.tenant_id || "",
        tenantName: tenantMap.get(session.tenant_id || "") || "Unknown",
        clientName: (session.clients as any)?.name || "Unknown",
        sessionDate: session.session_date,
        stylistName: (session.staff as any)?.name || null,
      }));
    },
  });
}
