import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

const GRACE_DAYS = 7;

export interface PlanInfo {
  id: string;
  name: string;
  basePriceCents: number;
  maxStaff: number;
  blurb: string;
  stripePriceId: string | null;
}

export type BillingState =
  | "none"       // no subscription yet (new salon, being onboarded)
  | "active"
  | "grace"      // payment failed — banners, still working
  | "readonly"   // grace expired — viewing allowed, logging blocked
  | "canceled";

export interface SubscriptionInfo {
  state: BillingState;
  planName: string | null;
  maxStaff: number | null;
  activeStaffCount: number;
  seatsRemaining: number | null;
  canAddStaff: boolean;
  canWrite: boolean;
  graceEndsAt: Date | null;
  cancelAtPeriodEnd: boolean;
  plans: PlanInfo[];
  isLoading: boolean;
}

export function useSubscription(): SubscriptionInfo {
  const { tenant } = useTenant();

  const subQuery = useQuery({
    queryKey: ["subscription", tenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("status, cancel_at_period_end, current_period_end, updated_at, plan:plan_id (id, name, base_price_cents, features_json)")
        .eq("tenant_id", tenant!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tenant?.id,
    staleTime: 60_000,
  });

  const plansQuery = useQuery({
    queryKey: ["billing-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("id, name, base_price_cents, features_json, stripe_price_id")
        .eq("is_active", true)
        .order("base_price_cents");
      if (error) throw error;
      return (data || []).map((p: any): PlanInfo => ({
        id: p.id,
        name: p.name,
        basePriceCents: p.base_price_cents,
        maxStaff: p.features_json?.max_staff ?? 999,
        blurb: p.features_json?.blurb ?? "",
        stripePriceId: p.stripe_price_id ?? null,
      }));
    },
    staleTime: 5 * 60_000,
  });

  const staffCountQuery = useQuery({
    queryKey: ["active-staff-count", tenant?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("staff")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!tenant?.id,
  });

  const sub = subQuery.data as any;
  const plan = sub?.plan ?? null;
  const activeStaffCount = staffCountQuery.data ?? 0;

  let state: BillingState = "none";
  let graceEndsAt: Date | null = null;
  if (sub) {
    if (sub.status === "active" || sub.status === "trialing") {
      state = "active";
    } else if (sub.status === "past_due") {
      // Grace runs from when the payment failed (updated_at), then read-only
      const failedAt = new Date(sub.updated_at ?? Date.now());
      graceEndsAt = new Date(failedAt.getTime() + GRACE_DAYS * 86_400_000);
      state = Date.now() < graceEndsAt.getTime() ? "grace" : "readonly";
    } else {
      state = "canceled";
    }
  }

  const maxStaff: number | null = plan ? (plan.features_json?.max_staff ?? 999) : null;
  const seatsRemaining = maxStaff !== null ? Math.max(0, maxStaff - activeStaffCount) : null;

  // "none" stays writable — new salons are hand-onboarded by HQ before billing
  const canWrite = state === "active" || state === "grace" || state === "none";
  const canAddStaff = canWrite && (maxStaff === null || activeStaffCount < maxStaff);

  return {
    state,
    planName: plan?.name ?? null,
    maxStaff,
    activeStaffCount,
    seatsRemaining,
    canAddStaff,
    canWrite,
    graceEndsAt,
    cancelAtPeriodEnd: sub?.cancel_at_period_end ?? false,
    plans: plansQuery.data ?? [],
    isLoading: subQuery.isLoading || plansQuery.isLoading,
  };
}

export async function startCheckout(planId: string) {
  const { data, error } = await supabase.functions.invoke("create-checkout-session", {
    body: { plan_id: planId, return_url: window.location.origin },
  });
  if (error || data?.error) throw new Error(data?.error || "Couldn't start checkout");
  window.location.href = data.url;
}

export async function openBillingPortal() {
  const { data, error } = await supabase.functions.invoke("create-portal-session", {
    body: { return_url: window.location.origin + "/settings" },
  });
  if (error || data?.error) throw new Error(data?.error || "Couldn't open billing portal");
  window.location.href = data.url;
}
