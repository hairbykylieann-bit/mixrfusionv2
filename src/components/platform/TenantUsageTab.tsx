import { useUsageAnalytics, useUsageSummary } from "@/hooks/platform/useUsageAnalytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Palette, Users, Package, FlaskConical, Activity } from "lucide-react";
import { format } from "date-fns";

interface TenantUsageTabProps {
  tenantId: string;
}

export function TenantUsageTab({ tenantId }: TenantUsageTabProps) {
  const { data: usage, isLoading: isLoadingUsage } = useUsageAnalytics({ tenantId, limit: 30 });
  const { data: summary, isLoading: isLoadingSummary } = useUsageSummary(tenantId, 30);

  const isLoading = isLoadingUsage || isLoadingSummary;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[100px]" />
          ))}
        </div>
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats (Last 30 Days) */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Color Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.total_sessions || 0}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FlaskConical className="h-4 w-4" />
              Bowls Mixed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.total_bowls || 0}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Clients Added
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.total_clients || 0}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Products Used
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.total_products || 0}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Days Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.days_active || 0}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Usage History */}
      <Card>
        <CardHeader>
          <CardTitle>Usage History</CardTitle>
          <CardDescription>Daily activity breakdown for the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          {usage && usage.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-center">Sessions</TableHead>
                  <TableHead className="text-center">Bowls</TableHead>
                  <TableHead className="text-center">Clients Added</TableHead>
                  <TableHead className="text-center">Products Used</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usage.map((day) => (
                  <TableRow key={day.id}>
                    <TableCell className="font-medium">
                      {format(new Date(day.date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-center">{day.color_sessions_count}</TableCell>
                    <TableCell className="text-center">{day.bowls_count}</TableCell>
                    <TableCell className="text-center">{day.clients_added_count}</TableCell>
                    <TableCell className="text-center">{day.products_used_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No usage data recorded for this tenant yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
