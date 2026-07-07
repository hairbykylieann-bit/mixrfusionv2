import { Download, FileText, FileSpreadsheet, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportToCSV, exportToPDF } from "@/lib/reportExport";
import type { StylistReportData, CategoryReportData, ReportStats } from "@/hooks/useReportsData";
import { toast } from "sonner";

interface DateRange {
  from: Date;
  to: Date;
}

interface ExportButtonProps {
  stats: ReportStats;
  stylistData: StylistReportData[];
  categoryData: CategoryReportData[];
  dateRange: DateRange | null;
  disabled?: boolean;
}

export function ExportButton({
  stats,
  stylistData,
  categoryData,
  dateRange,
  disabled = false,
}: ExportButtonProps) {
  const handleExport = (format: "pdf" | "csv-summary" | "csv-stylists" | "csv-products") => {
    if (!dateRange) {
      toast.error("Please select a date range first");
      return;
    }

    const exportData = {
      stats,
      stylistData,
      categoryData,
      dateRange,
    };

    try {
      switch (format) {
        case "pdf":
          exportToPDF(exportData);
          toast.success("PDF report opened in new tab");
          break;
        case "csv-summary":
          exportToCSV(exportData, "summary");
          toast.success("Summary CSV downloaded");
          break;
        case "csv-stylists":
          exportToCSV(exportData, "stylists");
          toast.success("Stylist report CSV downloaded");
          break;
        case "csv-products":
          exportToCSV(exportData, "products");
          toast.success("Product report CSV downloaded");
          break;
      }
    } catch (error) {
      toast.error("Failed to export report");
      console.error("Export error:", error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="gap-2">
          <Download className="w-4 h-4" />
          Export
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => handleExport("pdf")} className="gap-2">
          <FileText className="w-4 h-4" />
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleExport("csv-summary")} className="gap-2">
          <FileSpreadsheet className="w-4 h-4" />
          Summary CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("csv-stylists")} className="gap-2">
          <FileSpreadsheet className="w-4 h-4" />
          Stylist Report CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("csv-products")} className="gap-2">
          <FileSpreadsheet className="w-4 h-4" />
          Product Report CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
