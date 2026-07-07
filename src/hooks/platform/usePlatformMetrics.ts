import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PlatformMetrics {
  totalTenants: number;
  activeTenants: number;
  trialingTenants: number;
  trialsEndingSoon: number;
  mrrCents: number;
  totalStaff: number;
  totalClients: number;
  totalSessions: number;
}

export function usePlatformMetrics() {
  return useQuery({
    queryKey: ["platform-metrics"],
    queryFn: async (): Promise<PlatformMetrics> => {
      // Get tenant counts
      const { data: tenants } = await supabase
        .from("tenants")
        .select("id, status");

      const totalTenants = tenants?.length || 0;
      const activeTenants = tenants?.filter(t => t.status === "active").length || 0;

      // Get subscription stats
      const { data: subscriptions } = await supabase
        .from("subscriptions")
        .select(`
          id,
          status,
          seat_count,
          trial_end,
          plan_id,
          plans (
            base_price_cents,
            seat_price_cents
          )
        `);

      const trialingTenants = subscriptions?.filter(s => s.status === "trialing").length || 0;
      
      // Trials ending in next 7 days
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      
      const trialsEndingSoon = subscriptions?.filter(s => {
        if (s.status !== "trialing" || !s.trial_end) return false;
        const trialEnd = new Date(s.trial_end);
        return trialEnd <= sevenDaysFromNow && trialEnd >= new Date();
      }).length || 0;

      // Calculate MRR from active subscriptions
      let mrrCents = 0;
      subscriptions?.forEach(sub => {
        if (sub.status === "active" && sub.plans) {
          const plan = Array.isArray(sub.plans) ? sub.plans[0] : sub.plans;
          if (plan) {
            mrrCents += (plan.base_price_cents || 0) + ((plan.seat_price_cents || 0) * sub.seat_count);
          }
        }
      });

      // Get staff count
      const { count: totalStaff } = await supabase
        .from("staff")
        .select("*", { count: "exact", head: true });

      // Get clients count
      const { count: totalClients } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true });

      // Get sessions count (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count: totalSessions } = await supabase
        .from("color_sessions")
        .select("*", { count: "exact", head: true })
        .gte("session_date", thirtyDaysAgo.toISOString().split("T")[0]);

      return {
        totalTenants,
        activeTenants,
        trialingTenants,
        trialsEndingSoon,
        mrrCents,
        totalStaff: totalStaff || 0,
        totalClients: totalClients || 0,
        totalSessions: totalSessions || 0,
      };
    },
  });
}
