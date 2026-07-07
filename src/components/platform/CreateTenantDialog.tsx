import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlans } from "@/hooks/platform/usePlans";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface CreateTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTenantDialog({ open, onOpenChange }: CreateTenantDialogProps) {
  const queryClient = useQueryClient();
  const { plans } = usePlans();
  const activePlans = plans.filter((p) => p.is_active);

  const [formData, setFormData] = useState({
    name: "",
    ownerEmail: "",
    planId: "",
    seatCount: 1,
    trialDays: 14,
    notes: "",
  });

  const createTenant = useMutation({
    mutationFn: async () => {
      // Create tenant
      const { data: tenant, error: tenantError } = await supabase
        .from("tenants")
        .insert({
          name: formData.name,
          primary_contact_email: formData.ownerEmail,
          status: "active",
          notes: formData.notes || null,
        })
        .select()
        .single();

      if (tenantError) throw tenantError;

      // Create subscription
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + formData.trialDays);

      const { error: subError } = await supabase.from("subscriptions").insert({
        tenant_id: tenant.id,
        plan_id: formData.planId,
        status: "trialing",
        seat_count: formData.seatCount,
        trial_start: new Date().toISOString(),
        trial_end: trialEnd.toISOString(),
      });

      if (subError) throw subError;

      // Create whitelabel settings
      await supabase.from("whitelabel_settings").insert({
        tenant_id: tenant.id,
        app_name: formData.name,
      });

      return tenant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-tenants"] });
      queryClient.invalidateQueries({ queryKey: ["platform-metrics"] });
      toast({
        title: "Tenant created",
        description: `${formData.name} has been created successfully.`,
      });
      onOpenChange(false);
      setFormData({
        name: "",
        ownerEmail: "",
        planId: "",
        seatCount: 1,
        trialDays: 14,
        notes: "",
      });
    },
    onError: (error) => {
      toast({
        title: "Error creating tenant",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.planId) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    createTenant.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Tenant</DialogTitle>
          <DialogDescription>
            Add a new salon to the platform. They will start with a trial subscription.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Salon Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Amazing Hair Studio"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ownerEmail">Owner Email</Label>
            <Input
              id="ownerEmail"
              type="email"
              value={formData.ownerEmail}
              onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
              placeholder="owner@salon.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan">Plan *</Label>
            <Select
              value={formData.planId}
              onValueChange={(value) => setFormData({ ...formData, planId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent>
                {activePlans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name} (${(plan.base_price_cents / 100).toFixed(2)} + ${(plan.seat_price_cents / 100).toFixed(2)}/seat)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="seatCount">Seats</Label>
              <Input
                id="seatCount"
                type="number"
                min="1"
                value={formData.seatCount}
                onChange={(e) => setFormData({ ...formData, seatCount: parseInt(e.target.value) || 1 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trialDays">Trial Days</Label>
              <Input
                id="trialDays"
                type="number"
                min="0"
                value={formData.trialDays}
                onChange={(e) => setFormData({ ...formData, trialDays: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional notes..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTenant.isPending}>
              {createTenant.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Tenant
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
