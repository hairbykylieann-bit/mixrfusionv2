import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logAuditEvent, AuditActions } from "@/lib/auditLogger";
import { useAuth } from "@/contexts/AuthContext";

export interface Plan {
  id: string;
  name: string;
  seat_price_cents: number;
  base_price_cents: number;
  currency: string;
  features_json: Record<string, any>;
  is_active: boolean;
  stripe_price_id: string | null;
  created_at: string;
}

export interface PlanFormData {
  name: string;
  seat_price_cents: number;
  base_price_cents: number;
  currency?: string;
  features_json?: Record<string, any>;
  is_active?: boolean;
}

export function usePlans() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: plans, isLoading, error } = useQuery({
    queryKey: ["platform-plans"],
    queryFn: async (): Promise<Plan[]> => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .order("base_price_cents", { ascending: true });

      if (error) throw error;
      return data as Plan[];
    },
  });

  const createPlan = useMutation({
    mutationFn: async (formData: PlanFormData) => {
      const { data, error } = await supabase
        .from("plans")
        .insert([{
          name: formData.name,
          seat_price_cents: formData.seat_price_cents,
          base_price_cents: formData.base_price_cents,
          currency: formData.currency || "usd",
          features_json: formData.features_json || {},
          is_active: formData.is_active ?? true,
        }])
        .select()
        .single();

      if (error) throw error;
      
      // Log audit event
      if (user) {
        await logAuditEvent({
          action: AuditActions.PLAN_CREATED,
          actorType: "platform_admin",
          actorUserId: user.id,
          metadata: { plan_id: data.id, plan_name: data.name },
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-plans"] });
    },
  });

  const updatePlan = useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: PlanFormData }) => {
      const { data, error } = await supabase
        .from("plans")
        .update({
          name: formData.name,
          seat_price_cents: formData.seat_price_cents,
          base_price_cents: formData.base_price_cents,
          currency: formData.currency,
          features_json: formData.features_json,
          is_active: formData.is_active,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      
      // Log audit event
      if (user) {
        await logAuditEvent({
          action: AuditActions.PLAN_UPDATED,
          actorType: "platform_admin",
          actorUserId: user.id,
          metadata: { plan_id: id, plan_name: formData.name },
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-plans"] });
    },
  });

  const deletePlan = useMutation({
    mutationFn: async (id: string) => {
      // Get plan name before deleting for audit log
      const { data: planData } = await supabase
        .from("plans")
        .select("name")
        .eq("id", id)
        .single();

      const { error } = await supabase
        .from("plans")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      // Log audit event
      if (user) {
        await logAuditEvent({
          action: AuditActions.PLAN_DELETED,
          actorType: "platform_admin",
          actorUserId: user.id,
          metadata: { plan_id: id, plan_name: planData?.name },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-plans"] });
    },
  });

  return {
    plans: plans || [],
    isLoading,
    error,
    createPlan,
    updatePlan,
    deletePlan,
  };
}
