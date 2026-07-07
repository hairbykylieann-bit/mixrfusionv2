import { useState } from "react";
import { Link } from "react-router-dom";
import { TenantWithDetails, useTenants } from "@/hooks/platform/useTenants";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Eye, 
  MoreHorizontal, 
  Search, 
  Users, 
  Pencil, 
  PauseCircle, 
  Archive, 
  Trash2,
  PlayCircle 
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { EditTenantDialog } from "./EditTenantDialog";
import { DeleteTenantDialog } from "./DeleteTenantDialog";
import { toast } from "@/hooks/use-toast";

interface TenantTableProps {
  tenants: TenantWithDetails[];
  isLoading: boolean;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function getStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active":
      return "default";
    case "trialing":
      return "secondary";
    case "past_due":
      return "destructive";
    case "canceled":
    case "suspended":
    case "archived":
      return "outline";
    default:
      return "secondary";
  }
}

export function TenantTable({ tenants, isLoading }: TenantTableProps) {
  const [search, setSearch] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<TenantWithDetails | null>(null);
  const { updateTenant } = useTenants();

  const filteredTenants = tenants.filter(
    (tenant) =>
      tenant.name.toLowerCase().includes(search.toLowerCase()) ||
      tenant.primary_contact_email?.toLowerCase().includes(search.toLowerCase())
  );

  const calculateUpcomingCost = (tenant: TenantWithDetails): number => {
    if (!tenant.subscription?.plan) return 0;
    const { base_price_cents, seat_price_cents } = tenant.subscription.plan;
    return base_price_cents + seat_price_cents * tenant.subscription.seat_count;
  };

  const handleStatusChange = async (tenant: TenantWithDetails, newStatus: "active" | "suspended" | "archived") => {
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

  const openEditDialog = (tenant: TenantWithDetails) => {
    setSelectedTenant(tenant);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (tenant: TenantWithDetails) => {
    setSelectedTenant(tenant);
    setDeleteDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-pulse text-muted-foreground">Loading tenants...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search tenants..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Seats</TableHead>
              <TableHead>Sub Status</TableHead>
              <TableHead>Trial Ends</TableHead>
              <TableHead>Monthly Cost</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTenants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No tenants found
                </TableCell>
              </TableRow>
            ) : (
              filteredTenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{tenant.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {tenant.primary_contact_email || "No email"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(tenant.status)}>
                      {tenant.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {tenant.subscription?.plan?.name || "No plan"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      {tenant.subscription?.seat_count || 0}
                    </div>
                  </TableCell>
                  <TableCell>
                    {tenant.subscription ? (
                      <Badge variant={getStatusBadgeVariant(tenant.subscription.status)}>
                        {tenant.subscription.status}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {tenant.subscription?.status === "trialing" && tenant.subscription.trial_end ? (
                      <span className="text-sm">
                        {formatDistanceToNow(new Date(tenant.subscription.trial_end), {
                          addSuffix: true,
                        })}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">
                      {formatCurrency(calculateUpcomingCost(tenant))}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/platform/tenants/${tenant.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditDialog(tenant)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {tenant.status === "suspended" ? (
                          <DropdownMenuItem onClick={() => handleStatusChange(tenant, "active")}>
                            <PlayCircle className="mr-2 h-4 w-4" />
                            Activate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleStatusChange(tenant, "suspended")}>
                            <PauseCircle className="mr-2 h-4 w-4" />
                            Suspend
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleStatusChange(tenant, "archived")}>
                          <Archive className="mr-2 h-4 w-4" />
                          Archive
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => openDeleteDialog(tenant)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialogs */}
      <EditTenantDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        tenant={selectedTenant}
      />
      <DeleteTenantDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        tenant={selectedTenant}
      />
    </div>
  );
}
