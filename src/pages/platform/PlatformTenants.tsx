import { useState } from "react";
import { PlatformLayout } from "@/components/platform/PlatformLayout";
import { TenantTable } from "@/components/platform/TenantTable";
import { CreateTenantDialog } from "@/components/platform/CreateTenantDialog";
import { useTenants } from "@/hooks/platform/useTenants";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function PlatformTenants() {
  const { tenants, isLoading } = useTenants();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  return (
    <PlatformLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
            <p className="text-muted-foreground">
              Manage salons and their subscriptions.
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Tenant
          </Button>
        </div>

        {/* Tenant Table */}
        <TenantTable tenants={tenants} isLoading={isLoading} />

        {/* Create Dialog */}
        <CreateTenantDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />
      </div>
    </PlatformLayout>
  );
}
