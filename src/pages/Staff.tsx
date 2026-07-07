import { useState, useEffect, useMemo } from "react";
import { Plus, User, Loader2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { useStaff, type StaffWithStats } from "@/hooks/useStaff";
import { AddStaffDialog } from "@/components/staff/AddStaffDialog";
import { StaffDetailSheet } from "@/components/staff/StaffDetailSheet";
import { StaffCard } from "@/components/staff/StaffCard";
import { StaffFilters } from "@/components/staff/StaffFilters";

import { AccessDenied } from "@/components/reports/AccessDenied";
import { useEffectiveStaff } from "@/hooks/useEffectiveStaff";

import { toast } from "sonner";

export default function Staff() {
  const { staff, isLoading, updateStaff } = useStaff();
  const { effectiveStaff, isLoading: staffLoading } = useEffectiveStaff();
  
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffWithStats | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);


  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");

  // Sync selectedStaff with fresh data from query
  useEffect(() => {
    if (selectedStaff && staff.length > 0) {
      const updatedStaff = staff.find((s) => s.id === selectedStaff.id);
      if (updatedStaff) {
        setSelectedStaff(updatedStaff);
      }
    }
  }, [staff, selectedStaff]);

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staff.filter((member) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        member.name.toLowerCase().includes(searchLower) ||
        (member.email && member.email.toLowerCase().includes(searchLower));

      // Role filter
      const matchesRole = roleFilter === "all" || member.role === roleFilter;

      // Status filter
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && member.is_active) ||
        (statusFilter === "inactive" && !member.is_active);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [staff, searchQuery, roleFilter, statusFilter]);

  const handleEdit = (member: StaffWithStats) => {
    setSelectedStaff(member);
    setSheetOpen(true);
  };

  const handleToggleActive = async (member: StaffWithStats) => {
    if (member.role === "owner" && member.is_active) {
      toast.error("Owner accounts cannot be deactivated");
      return;
    }

    try {
      await updateStaff.mutateAsync({
        id: member.id,
        updates: { is_active: !member.is_active },
      });
      toast.success(
        member.is_active ? "Staff member deactivated" : "Staff member activated"
      );
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  // Show loading state
  if (staffLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <PageLayout title="Staff" subtitle="Manage your team members and permissions">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </PageLayout>
      </div>
    );
  }

  // Permission check - only users with can_manage_staff can access
  if (!effectiveStaff?.permissions.can_manage_staff) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <PageLayout title="Staff" subtitle="Manage your team members and permissions">
          <AccessDenied
            title="Staff Management Restricted"
            message="You don't have permission to manage staff members. Contact your salon owner or manager for access."
          />
        </PageLayout>
      </div>
    );
  }

  const isOwnerViewing = effectiveStaff.role === "owner";

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <PageLayout
        title="Staff"
        subtitle="Manage your team members and permissions"
        action={
          <Button className="gap-2" onClick={() => setAddDialogOpen(true)}>
            <Plus className="w-4 h-4" />
            Add Staff
          </Button>
        }
      >

        {staff.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No staff members yet
            </h3>
            <p className="text-muted-foreground mb-4">
              Add your first team member to get started
            </p>
            <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Staff
            </Button>
          </div>
        ) : (
          <>
            <StaffFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              roleFilter={roleFilter}
              onRoleFilterChange={setRoleFilter}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
            />

            {filteredStaff.length === 0 ? (
              <div className="text-center py-12">
                <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No matching staff
                </h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or filters
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredStaff.map((member, index) => (
                  <StaffCard
                    key={member.id}
                    member={member}
                    index={index}
                    isOwnerViewing={isOwnerViewing}
                    onEdit={() => handleEdit(member)}
                    onToggleActive={() => handleToggleActive(member)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </PageLayout>

      <AddStaffDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        isOwnerViewing={isOwnerViewing}
      />
      <StaffDetailSheet
        staff={selectedStaff}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        isOwnerViewing={isOwnerViewing}
      />
    </div>
  );
}
