import { useState, useEffect } from "react";
import { TenantWithDetails, useTenants } from "@/hooks/platform/useTenants";
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

interface EditTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: TenantWithDetails | null;
}

export function EditTenantDialog({ open, onOpenChange, tenant }: EditTenantDialogProps) {
  const { updateTenant, updateSubscriptionSeats } = useTenants();
  const { plans } = usePlans();
  const activePlans = plans.filter((p) => p.is_active);

  const [formData, setFormData] = useState({
    name: "",
    primaryContactEmail: "",
    status: "active" as "active" | "suspended" | "archived",
    notes: "",
    seatCount: 1,
  });

  // Update form when tenant changes
  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name,
        primaryContactEmail: tenant.primary_contact_email || "",
        status: tenant.status,
        notes: tenant.notes || "",
        seatCount: tenant.subscription?.seat_count || 1,
      });
    }
  }, [tenant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;

    if (!formData.name) {
      toast({
        title: "Missing fields",
        description: "Salon name is required.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Update tenant details
      await updateTenant.mutateAsync({
        id: tenant.id,
        updates: {
          name: formData.name,
          primary_contact_email: formData.primaryContactEmail || null,
          status: formData.status,
          notes: formData.notes || null,
        },
      });

      // Update seat count if changed
      if (tenant.subscription && formData.seatCount !== tenant.subscription.seat_count) {
        await updateSubscriptionSeats.mutateAsync({
          tenantId: tenant.id,
          seatCount: formData.seatCount,
        });
      }

      toast({
        title: "Tenant updated",
        description: `${formData.name} has been updated successfully.`,
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error updating tenant",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const isPending = updateTenant.isPending || updateSubscriptionSeats.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Tenant</DialogTitle>
          <DialogDescription>
            Update salon details and subscription settings.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Salon Name *</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Amazing Hair Studio"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-email">Contact Email</Label>
            <Input
              id="edit-email"
              type="email"
              value={formData.primaryContactEmail}
              onChange={(e) => setFormData({ ...formData, primaryContactEmail: e.target.value })}
              placeholder="owner@salon.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: "active" | "suspended" | "archived") => 
                setFormData({ ...formData, status: value })
              }
            >
              <SelectTrigger id="edit-status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-seats">Seat Count</Label>
            <Input
              id="edit-seats"
              type="number"
              min="1"
              value={formData.seatCount}
              onChange={(e) => setFormData({ ...formData, seatCount: parseInt(e.target.value) || 1 })}
            />
            {tenant?.subscription?.plan && (
              <p className="text-xs text-muted-foreground">
                Current plan: {tenant.subscription.plan.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea
              id="edit-notes"
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
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
