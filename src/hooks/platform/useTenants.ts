import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logAuditEvent, AuditActions } from "@/lib/auditLogger";
import { useAuth } from "@/contexts/AuthContext";

export interface TenantWithDetails {
  id: string;
  name: string;
  status: "active" | "suspended" | "archived";
  primary_contact_email: string | null;
  owner_user_id: string | null;
  created_at: string;
  notes: string | null;
  subscription?: {
    id: string;
    status: "trialing" | "active" | "past_due" | "canceled";
    seat_count: number;
    trial_start: string | null;
    trial_end: string | null;
    plan?: {
      id: string;
      name: string;
      seat_price_cents: number;
      base_price_cents: number;
    };
  };
  staff_count?: number;
  clients_count?: number;
}

export function useTenants() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: tenants, isLoading, error } = useQuery({
    queryKey: ["platform-tenants"],
    queryFn: async (): Promise<TenantWithDetails[]> => {
      // Get tenants with subscriptions
      const { data: tenantsData, error: tenantsError } = await supabase
        .from("tenants")
        .select(`
          *,
          subscriptions (
            id,
            status,
            seat_count,
            trial_start,
            trial_end,
            plan_id
          )
        `)
        .order("created_at", { ascending: false });

      if (tenantsError) throw tenantsError;

      // Get plans for subscription details
      const { data: plansData } = await supabase
        .from("plans")
        .select("id, name, seat_price_cents, base_price_cents");

      const plansMap = new Map(plansData?.map(p => [p.id, p]) || []);

      // Get staff counts per tenant
      const { data: staffCounts } = await supabase
        .from("staff")
        .select("tenant_id")
        .not("tenant_id", "is", null);

      const staffCountMap = new Map<string, number>();
      staffCounts?.forEach(s => {
        if (s.tenant_id) {
          staffCountMap.set(s.tenant_id, (staffCountMap.get(s.tenant_id) || 0) + 1);
        }
      });

      // Get client counts per tenant
      const { data: clientCounts } = await supabase
        .from("clients")
        .select("tenant_id")
        .not("tenant_id", "is", null);

      const clientCountMap = new Map<string, number>();
      clientCounts?.forEach(c => {
        if (c.tenant_id) {
          clientCountMap.set(c.tenant_id, (clientCountMap.get(c.tenant_id) || 0) + 1);
        }
      });

      return (tenantsData || []).map(tenant => {
        const subscription = Array.isArray(tenant.subscriptions) 
          ? tenant.subscriptions[0] 
          : tenant.subscriptions;
        
        const plan = subscription?.plan_id ? plansMap.get(subscription.plan_id) : undefined;

        return {
          id: tenant.id,
          name: tenant.name,
          status: tenant.status as TenantWithDetails["status"],
          primary_contact_email: tenant.primary_contact_email,
          owner_user_id: tenant.owner_user_id,
          created_at: tenant.created_at,
          notes: tenant.notes,
          subscription: subscription ? {
            id: subscription.id,
            status: subscription.status as TenantWithDetails["subscription"]["status"],
            seat_count: subscription.seat_count,
            trial_start: subscription.trial_start,
            trial_end: subscription.trial_end,
            plan: plan ? {
              id: plan.id,
              name: plan.name,
              seat_price_cents: plan.seat_price_cents,
              base_price_cents: plan.base_price_cents,
            } : undefined,
          } : undefined,
          staff_count: staffCountMap.get(tenant.id) || 0,
          clients_count: clientCountMap.get(tenant.id) || 0,
        };
      });
    },
  });

  const updateTenant = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<TenantWithDetails> }) => {
      const { data, error } = await supabase
        .from("tenants")
        .update({
          name: updates.name,
          status: updates.status,
          primary_contact_email: updates.primary_contact_email,
          notes: updates.notes,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      
      // Log audit event
      if (user) {
        const action = updates.status 
          ? AuditActions.TENANT_STATUS_CHANGED 
          : AuditActions.TENANT_UPDATED;
        await logAuditEvent({
          action,
          actorType: "platform_admin",
          actorUserId: user.id,
          tenantId: id,
          metadata: { 
            new_status: updates.status, 
            tenant_name: updates.name || data.name 
          },
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-tenants"] });
    },
  });

  const updateSubscriptionSeats = useMutation({
    mutationFn: async ({ tenantId, seatCount }: { tenantId: string; seatCount: number }) => {
      const { data, error } = await supabase
        .from("subscriptions")
        .update({ seat_count: seatCount })
        .eq("tenant_id", tenantId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-tenants"] });
    },
  });

  const deleteTenant = useMutation({
    mutationFn: async (tenantId: string) => {
      // Get tenant info for audit log before deletion
      const tenant = tenants?.find(t => t.id === tenantId);
      
      // Delete in order to maintain referential integrity
      // 1. Delete bowl_items (via session_bowls)
      const { data: bowls } = await supabase
        .from("session_bowls")
        .select("id")
        .eq("tenant_id", tenantId);
      
      if (bowls && bowls.length > 0) {
        const bowlIds = bowls.map(b => b.id);
        await supabase.from("bowl_items").delete().in("bowl_id", bowlIds);
      }
      
      // 2. Delete session_bowls
      await supabase.from("session_bowls").delete().eq("tenant_id", tenantId);
      
      // 3. Delete color_sessions
      await supabase.from("color_sessions").delete().eq("tenant_id", tenantId);
      
      // 4. Delete stock_adjustments
      await supabase.from("stock_adjustments").delete().eq("tenant_id", tenantId);
      
      // 5. Delete client_staff_relationships
      await supabase.from("client_staff_relationships").delete().eq("tenant_id", tenantId);
      
      // 6. Delete staff_invitations
      await supabase.from("staff_invitations").delete().eq("tenant_id", tenantId);
      
      // 7. Delete staff
      await supabase.from("staff").delete().eq("tenant_id", tenantId);
      
      // 8. Delete clients
      await supabase.from("clients").delete().eq("tenant_id", tenantId);
      
      // 9. Delete notifications
      await supabase.from("notifications").delete().eq("tenant_id", tenantId);
      
      // 10. Delete products
      await supabase.from("products").delete().eq("tenant_id", tenantId);
      
      // 11. Delete salon_settings
      await supabase.from("salon_settings").delete().eq("tenant_id", tenantId);
      
      // 12. Delete whitelabel_settings
      await supabase.from("whitelabel_settings").delete().eq("tenant_id", tenantId);
      
      // 13. Delete usage_daily
      await supabase.from("usage_daily").delete().eq("tenant_id", tenantId);
      
      // 14. Delete invoices and payments
      await supabase.from("payments").delete().eq("tenant_id", tenantId);
      await supabase.from("invoices").delete().eq("tenant_id", tenantId);
      
      // 15. Delete subscriptions
      await supabase.from("subscriptions").delete().eq("tenant_id", tenantId);
      
      // 16. Delete tenant_users
      await supabase.from("tenant_users").delete().eq("tenant_id", tenantId);
      
      // 17. Delete audit_logs for this tenant
      await supabase.from("audit_logs").delete().eq("tenant_id", tenantId);
      
      // 18. Finally delete the tenant
      const { error } = await supabase
        .from("tenants")
        .delete()
        .eq("id", tenantId);

      if (error) throw error;
      
      // Log audit event for deletion
      if (user) {
        await logAuditEvent({
          action: AuditActions.TENANT_DELETED,
          actorType: "platform_admin",
          actorUserId: user.id,
          tenantId: null, // Tenant is deleted, use null
          metadata: { 
            deleted_tenant_id: tenantId,
            tenant_name: tenant?.name,
            staff_count: tenant?.staff_count,
            clients_count: tenant?.clients_count,
          },
        });
      }

      return tenantId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-tenants"] });
      queryClient.invalidateQueries({ queryKey: ["platform-metrics"] });
    },
  });

  return {
    tenants: tenants || [],
    isLoading,
    error,
    updateTenant,
    updateSubscriptionSeats,
    deleteTenant,
  };
}

export function useTenantById(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["platform-tenant", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from("tenants")
        .select(`
          *,
          subscriptions (
            *,
            plans (*)
          )
        `)
        .eq("id", tenantId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });
}
