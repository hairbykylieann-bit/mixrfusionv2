import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TenantStaffMember {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  custom_role_name: string | null;
  is_active: boolean;
  user_id: string | null;
  created_at: string;
}

export interface TenantUserRecord {
  id: string;
  user_id: string;
  tenant_id: string;
  role: string;
  created_at: string;
  profile?: {
    email: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

export function useTenantStaff(tenantId?: string) {
  return useQuery({
    queryKey: ["platform", "tenant-staff", tenantId],
    queryFn: async (): Promise<TenantStaffMember[]> => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from("staff")
        .select("id, name, email, phone, role, custom_role_name, is_active, user_id, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      return data as TenantStaffMember[];
    },
    enabled: !!tenantId,
  });
}

export function useTenantUsers(tenantId?: string) {
  return useQuery({
    queryKey: ["platform", "tenant-users", tenantId],
    queryFn: async (): Promise<TenantUserRecord[]> => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from("tenant_users")
        .select(`
          id,
          user_id,
          tenant_id,
          role,
          created_at
        `)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch profiles separately
      const userIds = (data || []).map((u) => u.user_id);
      
      if (userIds.length === 0) return data as TenantUserRecord[];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name")
        .in("id", userIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.id, p])
      );

      return (data || []).map((user) => ({
        ...user,
        profile: profileMap.get(user.user_id) || null,
      })) as TenantUserRecord[];
    },
    enabled: !!tenantId,
  });
}
