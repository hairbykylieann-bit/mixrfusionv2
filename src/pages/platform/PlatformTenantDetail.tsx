import { useParams, Link, useNavigate } from "react-router-dom";
import { PlatformLayout } from "@/components/platform/PlatformLayout";
import { useTenantById, useTenants } from "@/hooks/platform/useTenants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Building2, Users, Calendar, DollarSign, Activity, FileText, Pencil, PauseCircle, PlayCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import { TenantUsersTab } from "@/components/platform/TenantUsersTab";
import { TenantUsageTab } from "@/components/platform/TenantUsageTab";
import { TenantLogsTab } from "@/components/platform/TenantLogsTab";
import { EditTenantDialog } from "@/components/platform/EditTenantDialog";
import { DeleteTenantDialog } from "@/components/platform/DeleteTenantDialog";
import { TenantWithDetails } from "@/hooks/platform/useTenants";

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default function PlatformTenantDetail() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const { data: tenant, isLoading } = useTenantById(tenantId);
  const { updateSubscriptionSeats, updateTenant, tenants } = useTenants();
  const [seatCount, setSeatCount] = useState<number | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Get the full tenant with counts from the list
  const tenantWithCounts = tenants.find(t => t.id === tenantId) || null;

  if (isLoading) {
    return (
      <PlatformLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[400px]" />
        </div>
      </PlatformLayout>
    );
  }

  if (!tenant) {
    return (
      <PlatformLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold">Tenant not found</h2>
          <p className="text-muted-foreground mt-2">
            The tenant you're looking for doesn't exist.
          </p>
          <Link to="/platform/tenants">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Tenants
            </Button>
          </Link>
        </div>
      </PlatformLayout>
    );
  }

  const subscription = Array.isArray(tenant.subscriptions)
    ? tenant.subscriptions[0]
    : tenant.subscriptions;

  const plan = subscription?.plans
    ? Array.isArray(subscription.plans)
      ? subscription.plans[0]
      : subscription.plans
    : null;

  const upcomingCost = plan
    ? (plan.base_price_cents || 0) + (plan.seat_price_cents || 0) * (subscription?.seat_count || 0)
    : 0;

  const handleUpdateSeats = async () => {
    if (seatCount === null || !tenantId) return;
    try {
      await updateSubscriptionSeats.mutateAsync({ tenantId, seatCount });
      toast({
        title: "Seats updated",
        description: `Seat count updated to ${seatCount}.`,
      });
      setSeatCount(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (newStatus: "active" | "suspended" | "archived") => {
    if (!tenant) return;
    try {
      await updateTenant.mutateAsync({
        id: tenant.id,
        updates: { status: newStatus },
      });
      toast({
        title: "Status updated",
        description: `${tenant.name} is now ${newStatus}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleted = () => {
    navigate("/platform/tenants");
  };

  return (
    <PlatformLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/platform/tenants">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{tenant.name}</h1>
              <Badge
                variant={
                  tenant.status === "active"
                    ? "default"
                    : tenant.status === "suspended"
                    ? "destructive"
                    : "secondary"
                }
              >
                {tenant.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {tenant.primary_contact_email || "No email set"}
            </p>
          </div>
          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
            {tenant.status === "suspended" ? (
              <Button variant="outline" size="sm" onClick={() => handleStatusChange("active")}>
                <PlayCircle className="mr-2 h-4 w-4" />
                Activate
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => handleStatusChange("suspended")}>
                <PauseCircle className="mr-2 h-4 w-4" />
                Suspend
              </Button>
            )}
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        {/* Dialogs */}
        <EditTenantDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          tenant={tenantWithCounts}
        />
        <DeleteTenantDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          tenant={tenantWithCounts}
          onDeleted={handleDeleted}
        />

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <Building2 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="usage" className="gap-2">
              <Activity className="h-4 w-4" />
              Usage
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <FileText className="h-4 w-4" />
              Logs
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Billing
            </TabsTrigger>
            <TabsTrigger value="trial" className="gap-2">
              <Calendar className="h-4 w-4" />
              Trial
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Plan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{plan?.name || "No plan"}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Seats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{subscription?.seat_count || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Monthly Cost
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(upcomingCost)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Created
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatDistanceToNow(new Date(tenant.created_at), { addSuffix: true })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Details */}
            <Card>
              <CardHeader>
                <CardTitle>Tenant Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-muted-foreground">Tenant ID</Label>
                    <p className="font-mono text-sm">{tenant.id}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Owner Email</Label>
                    <p>{tenant.primary_contact_email || "Not set"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <p className="capitalize">{tenant.status}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Notes</Label>
                    <p>{tenant.notes || "No notes"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            {tenantId && <TenantUsersTab tenantId={tenantId} />}
          </TabsContent>

          <TabsContent value="usage" className="mt-6">
            {tenantId && <TenantUsageTab tenantId={tenantId} />}
          </TabsContent>

          <TabsContent value="logs" className="mt-6">
            {tenantId && <TenantLogsTab tenantId={tenantId} />}
          </TabsContent>

          <TabsContent value="billing" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Subscription</CardTitle>
                <CardDescription>
                  Current subscription details and seat management
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {subscription ? (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label className="text-muted-foreground">Plan</Label>
                        <p className="font-medium">{plan?.name || "Unknown"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Status</Label>
                        <Badge
                          variant={
                            subscription.status === "active"
                              ? "default"
                              : subscription.status === "trialing"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {subscription.status}
                        </Badge>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Base Price</Label>
                        <p>{formatCurrency(plan?.base_price_cents || 0)}/mo</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Seat Price</Label>
                        <p>{formatCurrency(plan?.seat_price_cents || 0)}/seat/mo</p>
                      </div>
                    </div>

                    <div className="border-t pt-6">
                      <Label className="text-muted-foreground mb-2 block">
                        Manage Seats
                      </Label>
                      <div className="flex items-center gap-4">
                        <Input
                          type="number"
                          min="1"
                          value={seatCount ?? subscription.seat_count}
                          onChange={(e) => setSeatCount(parseInt(e.target.value) || 1)}
                          className="w-24"
                        />
                        <Button
                          onClick={handleUpdateSeats}
                          disabled={
                            seatCount === null ||
                            seatCount === subscription.seat_count ||
                            updateSubscriptionSeats.isPending
                          }
                        >
                          Update Seats
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Current: {subscription.seat_count} seats →{" "}
                          {formatCurrency(upcomingCost)}/mo
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground">No subscription found</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trial" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Trial Status</CardTitle>
                <CardDescription>
                  Manage the trial period for this tenant
                </CardDescription>
              </CardHeader>
              <CardContent>
                {subscription?.status === "trialing" ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label className="text-muted-foreground">Trial Started</Label>
                        <p>
                          {subscription.trial_start
                            ? format(new Date(subscription.trial_start), "PPP")
                            : "Not set"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Trial Ends</Label>
                        <p>
                          {subscription.trial_end
                            ? format(new Date(subscription.trial_end), "PPP")
                            : "Not set"}
                        </p>
                      </div>
                    </div>
                    {subscription.trial_end && (
                      <div className="rounded-lg bg-muted p-4">
                        <p className="text-sm">
                          Trial ends{" "}
                          <span className="font-medium">
                            {formatDistanceToNow(new Date(subscription.trial_end), {
                              addSuffix: true,
                            })}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    This tenant is not currently in a trial period.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PlatformLayout>
  );
}
