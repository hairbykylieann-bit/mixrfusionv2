import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStaffBreakdown, useClientsBreakdown, useSessionsBreakdown } from "@/hooks/platform/useMetricBreakdowns";
import { format } from "date-fns";

interface MetricDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metricType: "staff" | "clients" | "sessions" | null;
}

export function MetricDetailSheet({ open, onOpenChange, metricType }: MetricDetailSheetProps) {
  const navigate = useNavigate();
  
  const staffBreakdown = useStaffBreakdown();
  const clientsBreakdown = useClientsBreakdown();
  const sessionsBreakdown = useSessionsBreakdown();

  const handleTenantClick = (tenantId: string) => {
    onOpenChange(false);
    navigate(`/platform/tenants/${tenantId}`);
  };

  const getTitle = () => {
    switch (metricType) {
      case "staff": return "Staff by Tenant";
      case "clients": return "Clients by Tenant";
      case "sessions": return "Recent Sessions (30 Days)";
      default: return "";
    }
  };

  const renderContent = () => {
    if (metricType === "staff") {
      if (staffBreakdown.isLoading) return <LoadingSkeleton />;
      const data = staffBreakdown.data || [];
      
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Salon</TableHead>
              <TableHead className="text-right">Staff Count</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.tenantId}>
                <TableCell className="font-medium">{row.tenantName}</TableCell>
                <TableCell className="text-right">{row.count}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleTenantClick(row.tenantId)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  No staff data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      );
    }

    if (metricType === "clients") {
      if (clientsBreakdown.isLoading) return <LoadingSkeleton />;
      const data = clientsBreakdown.data || [];
      
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Salon</TableHead>
              <TableHead className="text-right">Client Count</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.tenantId}>
                <TableCell className="font-medium">{row.tenantName}</TableCell>
                <TableCell className="text-right">{row.count}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleTenantClick(row.tenantId)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  No client data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      );
    }

    if (metricType === "sessions") {
      if (sessionsBreakdown.isLoading) return <LoadingSkeleton />;
      const data = sessionsBreakdown.data || [];
      
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Stylist</TableHead>
              <TableHead>Salon</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{format(new Date(row.sessionDate), "MMM d, yyyy")}</TableCell>
                <TableCell className="font-medium">{row.clientName}</TableCell>
                <TableCell>{row.stylistName || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{row.tenantName}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleTenantClick(row.tenantId)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No sessions in the last 30 days
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      );
    }

    return null;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{getTitle()}</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          {renderContent()}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
