import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useTenant } from "@/contexts/TenantContext";

type Staff = Database["public"]["Tables"]["staff"]["Row"];
type StaffInsert = Database["public"]["Tables"]["staff"]["Insert"];
type StaffUpdate = Database["public"]["Tables"]["staff"]["Update"];
type AppRole = Database["public"]["Enums"]["app_role"];

export interface StaffWithStats extends Staff {
  servicesRecent: number;
  revenueRecent: number;
  totalServices: number;
  hasPin: boolean;
  invitation_status: string;
}

export function useStaff() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  const { data: staff, isLoading, error } = useQuery({
    queryKey: ["staff"],
    queryFn: async (): Promise<StaffWithStats[]> => {
      // Get all staff
      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .select("*")
        .order("name");

      if (staffError) throw staffError;

      // Get rolling 30-day date range
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      // Get sessions for last 30 days
      const { data: recentSessions, error: recentError } = await supabase
        .from("color_sessions")
        .select("stylist_id, total_cost")
        .gte("session_date", thirtyDaysAgo);

      if (recentError) throw recentError;

      // Get all-time session counts per stylist
      const { data: allSessions, error: allError } = await supabase
        .from("color_sessions")
        .select("stylist_id");

      if (allError) throw allError;

      // Calculate recent stats
      const recentMap = new Map<string, { services: number; revenue: number }>();
      recentSessions?.forEach((session) => {
        if (session.stylist_id) {
          const current = recentMap.get(session.stylist_id) || { services: 0, revenue: 0 };
          current.services += 1;
          current.revenue += Number(session.total_cost) || 0;
          recentMap.set(session.stylist_id, current);
        }
      });

      // Calculate all-time counts
      const totalMap = new Map<string, number>();
      allSessions?.forEach((session) => {
        if (session.stylist_id) {
          totalMap.set(session.stylist_id, (totalMap.get(session.stylist_id) || 0) + 1);
        }
      });

      // Merge stats with staff data
      return (staffData || []).map((member) => ({
        ...member,
        servicesRecent: recentMap.get(member.id)?.services || 0,
        revenueRecent: recentMap.get(member.id)?.revenue || 0,
        totalServices: totalMap.get(member.id) || 0,
        hasPin: !!member.pin_hash,
        invitation_status: member.invitation_status || "none",
      }));
    },
  });

  const createStaff = useMutation({
    mutationFn: async (newStaff: StaffInsert) => {
      const { data, error } = await supabase
        .from("staff")
        .insert({ ...newStaff, tenant_id: tenantId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["report-staff"] });
      queryClient.invalidateQueries({ queryKey: ["staff-report-member"] });
      queryClient.invalidateQueries({ queryKey: ["currentStaff"] });
    },
  });

  const updateStaff = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: StaffUpdate }) => {
      const { data, error } = await supabase
        .from("staff")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["report-staff"] });
      queryClient.invalidateQueries({ queryKey: ["staff-report-member"] });
      queryClient.invalidateQueries({ queryKey: ["currentStaff"] });
    },
  });

  return {
    staff: staff || [],
    isLoading,
    error,
    createStaff,
    updateStaff,
  };
}
