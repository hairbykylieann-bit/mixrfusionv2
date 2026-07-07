import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlatformLayout } from "@/components/platform/PlatformLayout";
import { StatCard } from "@/components/platform/StatCard";
import { PlatformHealthCard } from "@/components/platform/PlatformHealthCard";
import { RecentErrorsCard } from "@/components/platform/RecentErrorsCard";
import { ErrorLogViewer } from "@/components/platform/ErrorLogViewer";
import { MetricDetailSheet } from "@/components/platform/MetricDetailSheet";
import { usePlatformMetrics } from "@/hooks/platform/usePlatformMetrics";
import { Building2, Users, DollarSign, Clock, Palette, Calendar, CreditCard, AlertCircle, LayoutDashboard } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default function PlatformDashboard() {
  const { data: metrics, isLoading } = usePlatformMetrics();
  const navigate = useNavigate();
  
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetType, setSheetType] = useState<"staff" | "clients" | "sessions" | null>(null);

  const openSheet = (type: "staff" | "clients" | "sessions") => {
    setSheetType(type);
    setSheetOpen(true);
  };

  return (
    <PlatformLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your platform's performance and metrics.
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="errors" className="gap-2">
              <AlertCircle className="h-4 w-4" />
              Error Logs
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* KPI Grid */}
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-[120px]" />
                ))}
              </div>
            ) : metrics ? (
              <>
                {/* Primary Metrics */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    title="Total Tenants"
                    value={metrics.totalTenants}
                    subtitle="Salons on the platform"
                    icon={<Building2 className="h-4 w-4" />}
                    onClick={() => navigate("/platform/tenants")}
                  />
                  <StatCard
                    title="Active Tenants"
                    value={metrics.activeTenants}
                    subtitle="With active status"
                    icon={<Building2 className="h-4 w-4" />}
                    onClick={() => navigate("/platform/tenants?status=active")}
                  />
                  <StatCard
                    title="Trialing"
                    value={metrics.trialingTenants}
                    subtitle="In trial period"
                    icon={<Clock className="h-4 w-4" />}
                    onClick={() => navigate("/platform/tenants?status=trialing")}
                  />
                  <StatCard
                    title="MRR Estimate"
                    value={formatCurrency(metrics.mrrCents)}
                    subtitle="Monthly recurring revenue"
                    icon={<DollarSign className="h-4 w-4" />}
                  />
                </div>

                {/* Secondary Metrics */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    title="Trials Ending Soon"
                    value={metrics.trialsEndingSoon}
                    subtitle="Within next 7 days"
                    icon={<Calendar className="h-4 w-4" />}
                    className={metrics.trialsEndingSoon > 0 ? "border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/20" : ""}
                    onClick={() => navigate("/platform/tenants?filter=trials-ending")}
                  />
                  <StatCard
                    title="Total Staff"
                    value={metrics.totalStaff}
                    subtitle="Across all tenants"
                    icon={<Users className="h-4 w-4" />}
                    onClick={() => openSheet("staff")}
                  />
                  <StatCard
                    title="Total Clients"
                    value={metrics.totalClients}
                    subtitle="Across all tenants"
                    icon={<Users className="h-4 w-4" />}
                    onClick={() => openSheet("clients")}
                  />
                  <StatCard
                    title="Sessions (30d)"
                    value={metrics.totalSessions}
                    subtitle="Color sessions logged"
                    icon={<Palette className="h-4 w-4" />}
                    onClick={() => openSheet("sessions")}
                  />
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No metrics available
              </div>
            )}

            {/* Quick Overview Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Platform Health Card - Now with real data */}
              <PlatformHealthCard />

              {/* Recent Errors Card */}
              <RecentErrorsCard />

              {/* Billing Status Card */}
              <div className="rounded-lg border bg-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">Billing Status</h3>
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-3 w-3 rounded-full bg-warning" />
                  <span className="text-sm font-medium text-foreground">Mock Mode</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Stripe integration pending. Add your API key in settings to enable real billing.
                </p>
              </div>

              {/* Activity Summary Card */}
              <div className="rounded-lg border bg-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">Activity Summary</h3>
                  <Palette className="w-4 h-4 text-muted-foreground" />
                </div>
                {metrics ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Sessions (30d)</span>
                      <span className="font-medium text-foreground">{metrics.totalSessions}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Active salons</span>
                      <span className="font-medium text-foreground">{metrics.activeTenants}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total staff</span>
                      <span className="font-medium text-foreground">{metrics.totalStaff}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No activity data</p>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Error Logs Tab */}
          <TabsContent value="errors">
            <ErrorLogViewer />
          </TabsContent>
        </Tabs>
      </div>

      {/* Metric Detail Sheet */}
      <MetricDetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        metricType={sheetType}
      />
    </PlatformLayout>
  );
}
