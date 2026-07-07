import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Tenant {
  id: string;
  name: string;
  status: "active" | "suspended" | "archived";
  primary_contact_email: string | null;
  created_at: string;
}

export interface TenantUser {
  id: string;
  tenant_id: string;
  user_id: string;
  role: "owner" | "admin" | "stylist" | "assistant";
  created_at: string;
}

export function useTenantData() {
  const { user } = useAuth();

  const { data: tenantUser, isLoading: isLoadingTenantUser } = useQuery({
    queryKey: ["tenant-user", user?.id],
    queryFn: async (): Promise<TenantUser | null> => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("tenant_users")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }

      return data as TenantUser;
    },
    enabled: !!user,
  });

  const { data: tenant, isLoading: isLoadingTenant } = useQuery({
    queryKey: ["tenant", tenantUser?.tenant_id],
    queryFn: async (): Promise<Tenant | null> => {
      if (!tenantUser) return null;

      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", tenantUser.tenant_id)
        .single();

      if (error) throw error;

      return data as Tenant;
    },
    enabled: !!tenantUser,
  });

  return {
    tenant,
    tenantUser,
    tenantId: tenantUser?.tenant_id || null,
    isLoading: isLoadingTenantUser || isLoadingTenant,
  };
}

// Hook to check if current user is a platform admin
export function useIsPlatformAdmin() {
  const { user } = useAuth();

  const { data: isPlatformAdmin, isLoading } = useQuery({
    queryKey: ["is-platform-admin", user?.id],
    queryFn: async (): Promise<boolean> => {
      if (!user) return false;

      const { data, error } = await supabase
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .single();

      if (error) {
        if (error.code === "PGRST116") return false;
        throw error;
      }

      return !!data;
    },
    enabled: !!user,
  });

  return {
    isPlatformAdmin: isPlatformAdmin || false,
    isLoading,
  };
}
