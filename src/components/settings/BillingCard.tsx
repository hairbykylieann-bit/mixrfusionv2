import { useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, Users, Check, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useSubscription, startCheckout, openBillingPortal } from "@/hooks/useSubscription";

export function BillingCard() {
  const sub = useSubscription();
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);

  const choosePlan = async (planId: string) => {
    setBusyPlan(planId);
    try {
      await startCheckout(planId);
    } catch (e: any) {
      toast.error(e.message);
      setBusyPlan(null);
    }
  };

  const managePortal = async () => {
    setPortalBusy(true);
    try {
      await openBillingPortal();
    } catch (e: any) {
      toast.error(e.message);
      setPortalBusy(false);
    }
  };

  return (
    <motion.div className="stat-card space-y-5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center gap-3 pb-4 border-b border-border/50">
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-foreground">Subscription</h3>
          <p className="text-sm text-muted-foreground">Your Mix R Fusion plan, priced by team size</p>
        </div>
        {sub.state === "active" && <Badge className="bg-success text-success-foreground">Active</Badge>}
        {sub.state === "grace" && <Badge className="bg-warning text-warning-foreground">Payment issue</Badge>}
        {sub.state === "readonly" && <Badge variant="destructive">Read-only</Badge>}
        {sub.state === "canceled" && <Badge variant="destructive">Canceled</Badge>}
      </div>

      {(sub.state === "grace" || sub.state === "readonly") && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
          <p className="text-sm text-foreground">
            {sub.state === "grace"
              ? <>Your last payment didn't go through. Update your card before {sub.graceEndsAt?.toLocaleDateString()} to keep logging sessions.</>
              : <>Logging is paused until billing is fixed — your formulas and history are safe and viewable.</>}
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 text-sm">
        <Users className="w-4 h-4 text-muted-foreground" />
        <span className="text-foreground font-medium">{sub.activeStaffCount} active team member{sub.activeStaffCount === 1 ? "" : "s"}</span>
        {sub.maxStaff !== null && sub.maxStaff < 999 && (
          <span className="text-muted-foreground">of {sub.maxStaff} on your plan</span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {sub.plans.map((plan) => {
          const isCurrent = sub.planName === plan.name && (sub.state === "active" || sub.state === "grace");
          const fitsTeam = sub.activeStaffCount <= plan.maxStaff;
          return (
            <div
              key={plan.id}
              className={`rounded-lg border p-3 flex flex-col gap-1 ${isCurrent ? "border-champagne" : "border-border"}`}
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-foreground">{plan.name}</p>
                {isCurrent && <Check className="w-4 h-4 text-champagne" />}
              </div>
              <p className="text-xl font-semibold text-foreground">
                ${(plan.basePriceCents / 100).toFixed(0)}
                <span className="text-xs font-normal text-muted-foreground">/mo</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {plan.maxStaff >= 999 ? "Unlimited team" : `Up to ${plan.maxStaff} team member${plan.maxStaff === 1 ? "" : "s"}`}
              </p>
              {plan.blurb && <p className="text-xs text-muted-foreground">{plan.blurb}</p>}
              {!isCurrent && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  disabled={busyPlan !== null || !fitsTeam}
                  onClick={() => choosePlan(plan.id)}
                >
                  {busyPlan === plan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : sub.state === "none" ? "Choose" : "Switch"}
                </Button>
              )}
              {!fitsTeam && !isCurrent && (
                <p className="text-[11px] text-muted-foreground">Too small for your current team</p>
              )}
            </div>
          );
        })}
      </div>

      {sub.state !== "none" && (
        <Button variant="ghost" size="sm" className="text-muted-foreground" disabled={portalBusy} onClick={managePortal}>
          {portalBusy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
          Manage card and invoices
        </Button>
      )}
    </motion.div>
  );
}
