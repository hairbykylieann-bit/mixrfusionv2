import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

interface Tenant {
  id: string;
  name: string;
  status: "active" | "suspended" | "archived";
  primary_contact_email: string | null;
}

interface TenantUser {
  tenant_id: string;
  user_id: string;
  role: "owner" | "admin" | "stylist" | "assistant";
}

interface TenantContextType {
  tenant: Tenant | null;
  tenantUser: TenantUser | null;
  tenantId: string | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenantUser, setTenantUser] = useState<TenantUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTenantData = async () => {
    if (!user) {
      setTenant(null);
      setTenantUser(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Get the user's tenant membership
      const { data: tenantUserData, error: tenantUserError } = await supabase
        .from("tenant_users")
        .select("tenant_id, user_id, role")
        .eq("user_id", user.id)
        .single();

      if (tenantUserError) {
        // User might not have a tenant yet (new user)
        if (tenantUserError.code === "PGRST116") {
          setTenant(null);
          setTenantUser(null);
          setIsLoading(false);
          return;
        }
        throw tenantUserError;
      }

      setTenantUser(tenantUserData as TenantUser);

      // Get the tenant details
      const { data: tenantData, error: tenantError } = await supabase
        .from("tenants")
        .select("id, name, status, primary_contact_email")
        .eq("id", tenantUserData.tenant_id)
        .single();

      if (tenantError) throw tenantError;

      setTenant(tenantData as Tenant);
    } catch (err) {
      console.error("Error fetching tenant data:", err);
      setError(err instanceof Error ? err : new Error("Failed to fetch tenant"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTenantData();
  }, [user]);

  const value: TenantContextType = {
    tenant,
    tenantUser,
    tenantId: tenant?.id || null,
    isLoading,
    error,
    refetch: fetchTenantData,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}
