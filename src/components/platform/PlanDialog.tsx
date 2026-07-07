import { useEffect, useState } from "react";
import { Plan, PlanFormData, usePlans } from "@/hooks/platform/usePlans";
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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface PlanFeatures {
  max_staff?: number;
  max_clients?: number;
  reports?: boolean;
  ai_assistant?: boolean;
  whitelabel?: boolean;
  api_access?: boolean;
}

interface PlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: Plan | null;
}

export function PlanDialog({ open, onOpenChange, plan }: PlanDialogProps) {
  const { createPlan, updatePlan } = usePlans();
  const isEditing = !!plan;

  const [formData, setFormData] = useState<PlanFormData>({
    name: "",
    base_price_cents: 0,
    seat_price_cents: 0,
    is_active: true,
    features_json: {},
  });

  const [features, setFeatures] = useState<PlanFeatures>({
    max_staff: 5,
    max_clients: 100,
    reports: false,
    ai_assistant: false,
    whitelabel: false,
    api_access: false,
  });

  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name,
        base_price_cents: plan.base_price_cents,
        seat_price_cents: plan.seat_price_cents,
        is_active: plan.is_active,
        features_json: plan.features_json || {},
      });
      setFeatures({
        max_staff: plan.features_json?.max_staff ?? 5,
        max_clients: plan.features_json?.max_clients ?? 100,
        reports: plan.features_json?.reports ?? false,
        ai_assistant: plan.features_json?.ai_assistant ?? false,
        whitelabel: plan.features_json?.whitelabel ?? false,
        api_access: plan.features_json?.api_access ?? false,
      });
    } else {
      setFormData({
        name: "",
        base_price_cents: 0,
        seat_price_cents: 0,
        is_active: true,
        features_json: {},
      });
      setFeatures({
        max_staff: 5,
        max_clients: 100,
        reports: false,
        ai_assistant: false,
        whitelabel: false,
        api_access: false,
      });
    }
  }, [plan, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast({
        title: "Missing name",
        description: "Please enter a plan name.",
        variant: "destructive",
      });
      return;
    }

    const submitData: PlanFormData = {
      ...formData,
      features_json: features,
    };

    try {
      if (isEditing && plan) {
        await updatePlan.mutateAsync({ id: plan.id, formData: submitData });
        toast({
          title: "Plan updated",
          description: `${formData.name} has been updated.`,
        });
      } else {
        await createPlan.mutateAsync(submitData);
        toast({
          title: "Plan created",
          description: `${formData.name} has been created.`,
        });
      }
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const isPending = createPlan.isPending || updatePlan.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Plan" : "Create Plan"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the pricing plan details and features."
              : "Add a new pricing plan with features to offer to tenants."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Plan Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Pro"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="basePrice">Base Price ($/mo)</Label>
                <Input
                  id="basePrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={(formData.base_price_cents / 100).toFixed(2)}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      base_price_cents: Math.round(parseFloat(e.target.value || "0") * 100),
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="seatPrice">Seat Price ($/mo)</Label>
                <Input
                  id="seatPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={(formData.seat_price_cents / 100).toFixed(2)}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      seat_price_cents: Math.round(parseFloat(e.target.value || "0") * 100),
                    })
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="active">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Inactive plans won't be shown to new tenants
                </p>
              </div>
              <Switch
                id="active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>
          </div>

          <Separator />

          {/* Limits */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Usage Limits</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxStaff">Max Staff Members</Label>
                <Input
                  id="maxStaff"
                  type="number"
                  min="1"
                  value={features.max_staff || ""}
                  onChange={(e) =>
                    setFeatures({
                      ...features,
                      max_staff: parseInt(e.target.value) || undefined,
                    })
                  }
                  placeholder="Unlimited"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxClients">Max Clients</Label>
                <Input
                  id="maxClients"
                  type="number"
                  min="1"
                  value={features.max_clients || ""}
                  onChange={(e) =>
                    setFeatures({
                      ...features,
                      max_clients: parseInt(e.target.value) || undefined,
                    })
                  }
                  placeholder="Unlimited"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Feature Toggles */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Features</h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label>Reports & Analytics</Label>
                  <p className="text-xs text-muted-foreground">
                    Access to detailed reports and analytics
                  </p>
                </div>
                <Switch
                  checked={features.reports}
                  onCheckedChange={(checked) =>
                    setFeatures({ ...features, reports: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label>AI Assistant (Mira)</Label>
                  <p className="text-xs text-muted-foreground">
                    AI-powered voice assistant features
                  </p>
                </div>
                <Switch
                  checked={features.ai_assistant}
                  onCheckedChange={(checked) =>
                    setFeatures({ ...features, ai_assistant: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label>Whitelabel</Label>
                  <p className="text-xs text-muted-foreground">
                    Custom branding and domain
                  </p>
                </div>
                <Switch
                  checked={features.whitelabel}
                  onCheckedChange={(checked) =>
                    setFeatures({ ...features, whitelabel: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label>API Access</Label>
                  <p className="text-xs text-muted-foreground">
                    Access to public API endpoints
                  </p>
                </div>
                <Switch
                  checked={features.api_access}
                  onCheckedChange={(checked) =>
                    setFeatures({ ...features, api_access: checked })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
