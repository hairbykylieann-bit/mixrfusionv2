import { TenantWithDetails, useTenants } from "@/hooks/platform/useTenants";
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
import { toast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle } from "lucide-react";

interface DeleteTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: TenantWithDetails | null;
  onDeleted?: () => void;
}

export function DeleteTenantDialog({ 
  open, 
  onOpenChange, 
  tenant,
  onDeleted 
}: DeleteTenantDialogProps) {
  const { deleteTenant } = useTenants();

  const handleDelete = async () => {
    if (!tenant) return;

    try {
      await deleteTenant.mutateAsync(tenant.id);
      toast({
        title: "Tenant deleted",
        description: `${tenant.name} has been permanently deleted.`,
      });
      onOpenChange(false);
      onDeleted?.();
    } catch (error: any) {
      toast({
        title: "Error deleting tenant",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!tenant) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete "{tenant.name}"?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>This will permanently delete:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>{tenant.staff_count || 0}</strong> staff members</li>
                <li><strong>{tenant.clients_count || 0}</strong> clients</li>
                <li>All color sessions, bowls, and formulas</li>
                <li>All products and inventory data</li>
                <li>Subscription and billing history</li>
              </ul>
              <p className="font-medium text-destructive">
                This action cannot be undone.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteTenant.isPending}
          >
            {deleteTenant.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Permanently
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
