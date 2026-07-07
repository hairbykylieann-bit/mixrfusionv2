import { useState } from "react";
import { PlatformLayout } from "@/components/platform/PlatformLayout";
import { PlanCard } from "@/components/platform/PlanCard";
import { PlanDialog } from "@/components/platform/PlanDialog";
import { usePlans, Plan } from "@/hooks/platform/usePlans";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function PlatformPlans() {
  const { plans, isLoading, deletePlan } = usePlans();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<Plan | null>(null);

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingPlan) return;
    try {
      await deletePlan.mutateAsync(deletingPlan.id);
      toast({
        title: "Plan deleted",
        description: `${deletingPlan.name} has been deleted.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
    setDeletingPlan(null);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingPlan(null);
    }
  };

  return (
    <PlatformLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Plans</h1>
            <p className="text-muted-foreground">
              Manage subscription plans and pricing.
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Plan
          </Button>
        </div>

        {/* Plans Grid */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-[200px]" />
            ))}
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-12 border rounded-lg">
            <h3 className="text-lg font-semibold">No plans yet</h3>
            <p className="text-muted-foreground mt-1">
              Create your first pricing plan to get started.
            </p>
            <Button onClick={() => setDialogOpen(true)} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Create Plan
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onEdit={handleEdit}
                onDelete={setDeletingPlan}
              />
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <PlanDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          plan={editingPlan}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={!!deletingPlan} onOpenChange={() => setDeletingPlan(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Plan</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deletingPlan?.name}"? This action cannot
                be undone. Tenants currently on this plan will not be affected.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PlatformLayout>
  );
}
