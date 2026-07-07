import { format } from "date-fns";
import { convertGramsToDisplayUnit } from "@/lib/units";
import { Download, Pencil } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DateRangeSelector, type DateRange } from "@/components/reports/DateRangeSelector";
import type { StaffMember, StaffReportSummary, CategoryUsage } from "@/hooks/useStaffReport";

const roleLabels: Record<string, string> = {
  owner: "Owner",
  manager: "Manager",
  stylist: "Stylist",
  assistant: "Assistant",
  front_desk: "Front Desk",
  admin: "Admin",
};

interface StaffReportHeaderProps {
  staff: StaffMember;
  dateRange: DateRange;
  summary: StaffReportSummary;
  products: CategoryUsage[];
  onDateRangeChange: (range: DateRange) => void;
  onEdit?: () => void;
  canEdit?: boolean;
  displayUnit?: string;
}

export function StaffReportHeader({
  staff,
  dateRange,
  summary,
  products,
  onDateRangeChange,
  onEdit,
  canEdit,
  displayUnit = "g",
}: StaffReportHeaderProps) {
  const initials = staff.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleExportCSV = () => {
    const dateRangeStr = `${format(dateRange.from, "yyyy-MM-dd")}_to_${format(dateRange.to, "yyyy-MM-dd")}`;
    const filename = `staff_report_${staff.name.replace(/\s+/g, "_")}_${dateRangeStr}.csv`;

    const lines: string[] = [];
    lines.push(`Staff Performance Report - ${staff.name}`);
    lines.push(`Date Range,${format(dateRange.from, "yyyy-MM-dd")},${format(dateRange.to, "yyyy-MM-dd")}`);
    lines.push("");
    lines.push("Summary");
    lines.push(`Services,${summary.services}`);
    lines.push(`Bowls,${summary.bowlCount}`);
    lines.push(`Product Cost,$${summary.productCost.toFixed(2)}`);
    if (summary.serviceRevenue > 0) {
      lines.push(`Service Revenue,$${summary.serviceRevenue.toFixed(2)}`);
      lines.push(`Overage Charges,$${summary.overageRevenue.toFixed(2)}`);
    } else {
      lines.push(`Product Charge,$${summary.markupRevenue.toFixed(2)}`);
    }
    lines.push(`Bowl Fee Revenue,$${summary.bowlFeeRevenue.toFixed(2)}`);
    lines.push(`Total Charged to Clients,$${summary.grossRevenue.toFixed(2)}`);
    lines.push(`Gross Contribution,$${summary.netProfit.toFixed(2)}`);
    lines.push(`Waste,${summary.wastePercent.toFixed(1)}%`);
    const wasteInUnit = displayUnit === 'oz' ? convertGramsToDisplayUnit(summary.wasteAmount, 'oz') : summary.wasteAmount;
    lines.push(`Waste Amount,${wasteInUnit.toFixed(1)}${displayUnit === 'oz' ? 'oz' : 'g'}`);
    lines.push(`Waste Value,$${summary.wasteValue.toFixed(2)}`);
    lines.push("");
    lines.push("Product Usage by Category");
    lines.push("Category,Product,Amount Used,Unit,Cost,Revenue,Profit");

    products.forEach((cat) => {
      lines.push(`"${cat.category}",,${cat.totalAmountUsed.toFixed(1)},${cat.unit},$${cat.totalCost.toFixed(2)},$${cat.totalRevenue.toFixed(2)},$${cat.totalProfit.toFixed(2)}`);
      cat.items.forEach((item) => {
        lines.push(`,"${item.name}",${item.amountUsed.toFixed(1)},${item.unit},$${item.cost.toFixed(2)},$${item.revenue.toFixed(2)},$${item.profit.toFixed(2)}`);
      });
    });

    const csvContent = lines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    const dateRangeStr = `${format(dateRange.from, "MMM d, yyyy")} - ${format(dateRange.to, "MMM d, yyyy")}`;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to export PDF");
      return;
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Staff Report - ${staff.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 40px;
      color: #1a1a1a;
      line-height: 1.5;
    }
    .header { 
      display: flex; 
      justify-content: space-between; 
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e5e5e5;
    }
    .staff-info { display: flex; align-items: center; gap: 16px; }
    .avatar { 
      width: 60px; 
      height: 60px; 
      border-radius: 50%; 
      background: #f0f0f0; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      font-weight: bold;
      font-size: 20px;
    }
    .staff-name { font-size: 24px; font-weight: bold; }
    .staff-role { color: #666; font-size: 14px; }
    .date-range { color: #666; font-size: 14px; text-align: right; }
    h2 { margin: 30px 0 15px; font-size: 18px; color: #333; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
    .stat-box { padding: 15px; background: #f8f8f8; border-radius: 8px; }
    .stat-value { font-size: 24px; font-weight: bold; color: #1a1a1a; }
    .stat-label { font-size: 12px; color: #666; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e5e5; }
    th { background: #f5f5f5; font-weight: 600; color: #333; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .text-success { color: #16a34a; }
    .text-warning { color: #ca8a04; }
    .text-danger { color: #dc2626; }
    .category-row { font-weight: bold; background: #fafafa; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="staff-info">
      <div class="avatar">${initials}</div>
      <div>
        <div class="staff-name">${staff.name}</div>
        <div class="staff-role">${roleLabels[staff.role] || staff.role}</div>
      </div>
    </div>
    <div class="date-range">
      <div>Performance Report</div>
      <div>${dateRangeStr}</div>
    </div>
  </div>

  <h2>Summary</h2>
  <div class="stats-grid">
    <div class="stat-box">
      <div class="stat-value">${summary.services}</div>
      <div class="stat-label">Services</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">$${summary.grossRevenue.toFixed(2)}</div>
      <div class="stat-label">Charged to Clients</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">$${summary.netProfit.toFixed(2)}</div>
      <div class="stat-label">Gross Contribution</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">${summary.wastePercent.toFixed(1)}%</div>
      <div class="stat-label">Waste</div>
    </div>
  </div>

   <h2>Revenue Breakdown</h2>
  <table>
    ${summary.serviceRevenue > 0 ? `<tr><td>Service Revenue</td><td class="text-right">$${summary.serviceRevenue.toFixed(2)}</td></tr>` : ''}
    <tr><td>Product COGS (wholesale)</td><td class="text-right">$${summary.productCost.toFixed(2)}</td></tr>
    <tr><td>${summary.serviceRevenue > 0 ? 'Overage Charges' : 'Product Charge'}</td><td class="text-right">$${summary.serviceRevenue > 0 ? summary.overageRevenue.toFixed(2) : summary.markupRevenue.toFixed(2)}</td></tr>
    <tr><td>Bowl Fees (${summary.bowlCount} bowls)</td><td class="text-right">$${summary.bowlFeeRevenue.toFixed(2)}</td></tr>
    <tr style="font-weight: bold; border-top: 2px solid #333;">
      <td>Total Charged to Clients</td><td class="text-right">$${summary.grossRevenue.toFixed(2)}</td>
    </tr>
    <tr style="font-weight: bold;" class="text-success">
      <td>Gross Contribution</td><td class="text-right text-success">$${summary.netProfit.toFixed(2)}</td>
    </tr>
  </table>

  <h2>Product Usage</h2>
  <table>
    <thead>
      <tr>
        <th>Category / Product</th>
        <th class="text-right">Amount</th>
        <th class="text-right">Cost</th>
        <th class="text-right">Revenue</th>
        <th class="text-right">Profit</th>
      </tr>
    </thead>
    <tbody>
      ${products.map(cat => `
        <tr class="category-row">
          <td>${cat.category}</td>
          <td class="text-right">${cat.totalAmountUsed.toFixed(1)} ${cat.unit}</td>
          <td class="text-right">$${cat.totalCost.toFixed(2)}</td>
          <td class="text-right">$${cat.totalRevenue.toFixed(2)}</td>
          <td class="text-right">$${cat.totalProfit.toFixed(2)}</td>
        </tr>
        ${cat.items.map(item => `
          <tr>
            <td style="padding-left: 24px;">${item.name}${item.shade ? ` - ${item.shade}` : ''}</td>
            <td class="text-right">${item.amountUsed.toFixed(1)} ${item.unit}</td>
            <td class="text-right">$${item.cost.toFixed(2)}</td>
            <td class="text-right">$${item.revenue.toFixed(2)}</td>
            <td class="text-right">$${item.profit.toFixed(2)}</td>
          </tr>
        `).join('')}
      `).join('')}
    </tbody>
  </table>

  <h2>Waste Analysis</h2>
  <table>
    <tr><td>Total Waste</td><td class="text-right">${(displayUnit === 'oz' ? convertGramsToDisplayUnit(summary.wasteAmount, 'oz') : summary.wasteAmount).toFixed(1)}${displayUnit === 'oz' ? 'oz' : 'g'} (${summary.wastePercent.toFixed(1)}%)</td></tr>
    <tr><td>Waste Value (at cost)</td><td class="text-right">$${summary.wasteValue.toFixed(2)}</td></tr>
    <tr><td>Target</td><td class="text-right ${summary.wastePercent <= 5 ? 'text-success' : 'text-warning'}">&lt;5% ${summary.wastePercent <= 5 ? '✓' : ''}</td></tr>
  </table>

  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 11px; color: #999; text-align: center;">
    Generated by MixR Fusion • ${new Date().toLocaleDateString()}
  </div>
</body>
</html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  return (
    <motion.div
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center">
          <span className="font-semibold text-lg text-foreground">{initials}</span>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{staff.name}</h1>
          <Badge variant="secondary" className="mt-1">
            {roleLabels[staff.role] || staff.role}
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <DateRangeSelector onDateRangeChange={onDateRangeChange} />
        {canEdit && (
          <Button variant="outline" className="gap-2" onClick={onEdit}>
            <Pencil className="w-4 h-4" />
            Edit
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportCSV}>
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportPDF}>
              Export as PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}
