import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, FileText, Pencil } from "lucide-react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangeSelector, type DateRange, getDateRangeFromPreset } from "@/components/reports/DateRangeSelector";
import { useStaffReport } from "@/hooks/useStaffReport";
import { useCurrentStaff } from "@/hooks/useCurrentStaff";
import { useStaff } from "@/hooks/useStaff";
import { useSalonSettings } from "@/hooks/useSalonSettings";
import { AccessDenied } from "@/components/reports/AccessDenied";
import { StaffReportStats } from "@/components/staff/reports/StaffReportStats";
import { StaffReportCharts } from "@/components/staff/reports/StaffReportCharts";
import { StaffReportExport } from "@/components/staff/reports/StaffReportExport";
import { StaffRevenueBreakdown } from "@/components/staff/reports/StaffRevenueBreakdown";
import { StaffProductUsage } from "@/components/staff/reports/StaffProductUsage";
import { StaffWasteAnalysis } from "@/components/staff/reports/StaffWasteAnalysis";
import { StaffServiceClients } from "@/components/staff/reports/StaffServiceClients";
import { StaffDetailSheet } from "@/components/staff/StaffDetailSheet";

const roleLabels: Record<string, string> = {
  owner: "Owner",
  manager: "Manager",
  stylist: "Stylist",
  assistant: "Assistant",
  front_desk: "Front Desk",
  admin: "Admin",
};

export default function StaffReport() {
  const { staffId } = useParams<{ staffId: string }>();
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<DateRange>(() => getDateRangeFromPreset('last30days'));

  useEffect(() => {
    setDateRange(getDateRangeFromPreset('last30days'));
  }, [staffId]);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  
  const { currentStaff, isLoading: currentStaffLoading } = useCurrentStaff();
  const reportData = useStaffReport(staffId, dateRange);
  const { staff: allStaff } = useStaff();
  const { settings } = useSalonSettings();
  const displayUnit = settings?.preferred_display_unit || "g";
  
  const staffForEdit = allStaff.find(s => s.id === staffId);

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
  };

  // Loading state
  if (currentStaffLoading || reportData.isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <PageLayout title="Staff Report" subtitle="Loading...">
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </PageLayout>
      </div>
    );
  }

  // Permission check
  const canViewReports = currentStaff?.permissions.can_view_reports;
  const isOwner = currentStaff?.role === "owner";
  // Own-performance tier: a stylist may view THEIR OWN report without salon-wide access
  const isViewingSelf = !!currentStaff && currentStaff.id === staffId;
  const canViewOwn = isViewingSelf && (currentStaff?.permissions as any)?.can_view_own_reports;

  if (!canViewReports && !isOwner && !canViewOwn) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="page-container">
          <div className="page-content">
            <Button variant="ghost" onClick={() => navigate('/staff')} className="gap-2 mb-4">
              <ArrowLeft className="w-4 h-4" /> Back to Staff
            </Button>
            <AccessDenied
              title="Report Access Restricted"
              message="You don't have permission to view staff reports. Contact your salon owner or manager for access."
            />
          </div>
        </div>
      </div>
    );
  }

  // Staff not found
  if (!reportData.staff) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="page-container">
          <div className="page-content">
            <Button variant="ghost" onClick={() => navigate('/staff')} className="gap-2 mb-4">
              <ArrowLeft className="w-4 h-4" /> Back to Staff
            </Button>
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Staff Member Not Found</h3>
              <p className="text-muted-foreground">The staff member you're looking for doesn't exist.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const canViewCosts = isOwner || currentStaff?.permissions.can_view_product_costs;
  const canEdit = isOwner || currentStaff?.permissions.can_manage_staff;

  const staffRole = roleLabels[reportData.staff.role] || reportData.staff.role;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <PageLayout
        title={reportData.staff.name}
        subtitle={staffRole}
        action={
          <div className="flex items-center gap-2">
            <DateRangeSelector onDateRangeChange={handleDateRangeChange} />
            {canEdit && (
              <Button variant="outline" className="gap-2" onClick={() => setEditSheetOpen(true)}>
                <Pencil className="w-4 h-4" /> Edit
              </Button>
            )}
            <StaffReportExport
              staff={reportData.staff}
              dateRange={dateRange}
              summary={reportData.summary}
              products={reportData.products}
              displayUnit={displayUnit}
            />
          </div>
        }
      >
        <Button variant="ghost" onClick={() => navigate('/staff')} className="gap-2 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Staff
        </Button>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <StaffReportStats
            summary={reportData.summary}
            changes={reportData.changes}
            canViewCosts={canViewCosts}
          />
        </motion.div>

        {/* Charts Row */}
        <StaffReportCharts
          summary={reportData.summary}
          canViewCosts={canViewCosts}
        />

        {/* Empty state */}
        {reportData.summary.services === 0 ? (
          <motion.div
            className="text-center py-12 stat-card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Activity Recorded</h3>
            <p className="text-muted-foreground">
              {reportData.staff.name} has no color sessions recorded for this period.
            </p>
          </motion.div>
        ) : (
          /* Tabbed content */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Tabs defaultValue="revenue">
              <TabsList className="bg-secondary mb-6">
                <TabsTrigger value="revenue">Revenue</TabsTrigger>
                <TabsTrigger value="services">Services</TabsTrigger>
                <TabsTrigger value="products">Products</TabsTrigger>
                <TabsTrigger value="waste">Waste</TabsTrigger>
              </TabsList>

              <TabsContent value="revenue" className="mt-4">
                <StaffRevenueBreakdown
                  summary={reportData.summary}
                  canViewCosts={canViewCosts}
                />
              </TabsContent>

              <TabsContent value="services" className="mt-4">
                <StaffServiceClients
                  serviceGroups={reportData.serviceGroups}
                  canViewCosts={canViewCosts}
                  displayUnit={displayUnit}
                />
              </TabsContent>

              <TabsContent value="products" className="mt-4">
                <StaffProductUsage
                  products={reportData.products}
                  canViewCosts={canViewCosts}
                  displayUnit={displayUnit}
                />
              </TabsContent>

              <TabsContent value="waste" className="mt-4">
                <StaffWasteAnalysis
                  summary={reportData.summary}
                  wasteByCategory={reportData.wasteByCategory}
                  targetWaste={5}
                  canViewCosts={canViewCosts}
                  displayUnit={displayUnit}
                />
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
        
        {/* Edit Staff Sheet */}
        {staffForEdit && (
          <StaffDetailSheet
            staff={staffForEdit}
            open={editSheetOpen}
            onOpenChange={setEditSheetOpen}
            isOwnerViewing={isOwner}
          />
        )}
      </PageLayout>
    </div>
  );
}
