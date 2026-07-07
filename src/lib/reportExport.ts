import { format } from "date-fns";
import type { StylistReportData, CategoryReportData, ReportStats } from "@/hooks/useReportsData";

interface DateRange {
  from: Date;
  to: Date;
}

interface ExportData {
  stats: ReportStats;
  stylistData: StylistReportData[];
  categoryData: CategoryReportData[];
  dateRange: DateRange;
  salonName?: string;
  salonLogoUrl?: string;
}

/**
 * Export report data to CSV format
 */
export function exportToCSV(data: ExportData, type: "summary" | "stylists" | "products" = "summary") {
  const dateRangeStr = `${format(data.dateRange.from, "yyyy-MM-dd")}_to_${format(data.dateRange.to, "yyyy-MM-dd")}`;
  let csvContent = "";
  let filename = "";

  switch (type) {
    case "summary":
      csvContent = generateSummaryCSV(data);
      filename = `report_summary_${dateRangeStr}.csv`;
      break;
    case "stylists":
      csvContent = generateStylistsCSV(data);
      filename = `stylist_report_${dateRangeStr}.csv`;
      break;
    case "products":
      csvContent = generateProductsCSV(data);
      filename = `product_report_${dateRangeStr}.csv`;
      break;
  }

  downloadFile(csvContent, filename, "text/csv");
}

/**
 * Export report data to PDF using browser print
 */
export function exportToPDF(data: ExportData) {
  const dateRangeStr = `${format(data.dateRange.from, "MMM d, yyyy")} - ${format(data.dateRange.to, "MMM d, yyyy")}`;
  
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to export PDF");
    return;
  }

  const html = generatePDFHTML(data, dateRangeStr);
  printWindow.document.write(html);
  printWindow.document.close();
  
  // Wait for content to load, then print
  printWindow.onload = () => {
    printWindow.print();
  };
}

function generateSummaryCSV(data: ExportData): string {
  const { stats, dateRange, salonName } = data;
  const lines: string[] = [];
  const displayName = salonName || "MixR Fusion";

  lines.push(`${displayName} Report Summary`);
  lines.push(`Date Range,${format(dateRange.from, "yyyy-MM-dd")},${format(dateRange.to, "yyyy-MM-dd")}`);
  lines.push("");
  lines.push("Metric,Value,Change from Previous Period");
  lines.push(`Total Revenue,$${stats.totalRevenue.toFixed(2)},${stats.revenueChange !== null ? stats.revenueChange.toFixed(1) + "%" : "N/A"}`);
  lines.push(`Product Cost,$${stats.totalProductCost.toFixed(2)},`);
  lines.push(`Waste Percentage,${stats.wastePercent.toFixed(1)}%,${stats.wasteChange !== null ? stats.wasteChange.toFixed(1) + "%" : "N/A"}`);
  lines.push(`Average Service Cost,$${stats.avgServiceCost.toFixed(2)},${stats.avgCostChange !== null ? stats.avgCostChange.toFixed(1) + "%" : "N/A"}`);
  lines.push(`Net Margin,${stats.netMargin.toFixed(1)}%,`);
  lines.push(`Total Sessions,${stats.sessionCount},${stats.sessionCountChange !== null ? stats.sessionCountChange.toFixed(1) + "%" : "N/A"}`);
  lines.push(`Total Bowls,${stats.bowlCount},`);

  return lines.join("\n");
}

function generateStylistsCSV(data: ExportData): string {
  const { stylistData, dateRange, salonName } = data;
  const lines: string[] = [];
  const displayName = salonName || "MixR Fusion";

  lines.push(`${displayName} Stylist Report`);
  lines.push(`Date Range,${format(dateRange.from, "yyyy-MM-dd")},${format(dateRange.to, "yyyy-MM-dd")}`);
  lines.push("");
  lines.push("Stylist,Services,Bowls,Product Cost,Markup Revenue,Bowl Fee Revenue,Gross Revenue,Net Profit,Waste %");

  stylistData.forEach((stylist) => {
    lines.push(
      `"${stylist.name}",${stylist.services},${stylist.bowlCount},$${stylist.productCost.toFixed(2)},$${stylist.markupRevenue.toFixed(2)},$${stylist.bowlFeeRevenue.toFixed(2)},$${stylist.grossRevenue.toFixed(2)},$${stylist.netProfit.toFixed(2)},${stylist.waste.toFixed(1)}%`
    );
  });

  // Add totals
  const totals = {
    services: stylistData.reduce((sum, s) => sum + s.services, 0),
    bowlCount: stylistData.reduce((sum, s) => sum + s.bowlCount, 0),
    productCost: stylistData.reduce((sum, s) => sum + s.productCost, 0),
    markupRevenue: stylistData.reduce((sum, s) => sum + s.markupRevenue, 0),
    bowlFeeRevenue: stylistData.reduce((sum, s) => sum + s.bowlFeeRevenue, 0),
    grossRevenue: stylistData.reduce((sum, s) => sum + s.grossRevenue, 0),
    netProfit: stylistData.reduce((sum, s) => sum + s.netProfit, 0),
    waste: stylistData.length > 0 ? stylistData.reduce((sum, s) => sum + s.waste, 0) / stylistData.length : 0,
  };

  lines.push(
    `"TOTAL",${totals.services},${totals.bowlCount},$${totals.productCost.toFixed(2)},$${totals.markupRevenue.toFixed(2)},$${totals.bowlFeeRevenue.toFixed(2)},$${totals.grossRevenue.toFixed(2)},$${totals.netProfit.toFixed(2)},${totals.waste.toFixed(1)}%`
  );

  return lines.join("\n");
}

function generateProductsCSV(data: ExportData): string {
  const { categoryData, dateRange, salonName } = data;
  const lines: string[] = [];
  const displayName = salonName || "MixR Fusion";

  lines.push(`${displayName} Product Report`);
  lines.push(`Date Range,${format(dateRange.from, "yyyy-MM-dd")},${format(dateRange.to, "yyyy-MM-dd")}`);
  lines.push("");
  lines.push("Category,Product,Amount Used,Unit,Cost,Waste %");

  categoryData.forEach((category) => {
    // Category row
    lines.push(
      `"${category.category}",,${category.totalAmountUsed.toFixed(1)},${category.unit},$${category.totalCost.toFixed(2)},${category.waste.toFixed(1)}%`
    );

    // Product rows
    category.products.forEach((product) => {
      lines.push(
        `,"${product.name}",${product.amountUsed.toFixed(1)},${product.unit},$${product.cost.toFixed(2)},${product.waste.toFixed(1)}%`
      );
    });
  });

  return lines.join("\n");
}

function generatePDFHTML(data: ExportData, dateRangeStr: string): string {
  const { stats, stylistData, categoryData, salonName, salonLogoUrl } = data;
  const displayName = salonName || "MixR Fusion";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <title>${displayName} Report - ${dateRangeStr}</title>
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
    .logo { 
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 24px; 
      font-weight: bold; 
    }
    .logo img {
      width: 40px;
      height: 40px;
      object-fit: contain;
    }
    .date-range { 
      color: #666; 
      font-size: 14px;
    }
    h2 { 
      margin: 30px 0 15px; 
      font-size: 18px;
      color: #333;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 30px;
    }
    .stat-box {
      padding: 15px;
      background: #f8f8f8;
      border-radius: 8px;
    }
    .stat-value {
      font-size: 24px;
      font-weight: bold;
      color: #1a1a1a;
    }
    .stat-label {
      font-size: 12px;
      color: #666;
      margin-top: 4px;
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-bottom: 30px;
      font-size: 13px;
    }
    th, td { 
      padding: 10px; 
      text-align: left; 
      border-bottom: 1px solid #e5e5e5;
    }
    th { 
      background: #f5f5f5; 
      font-weight: 600;
      color: #333;
    }
    tr:last-child td { border-bottom: none; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-bold { font-weight: bold; }
    .text-success { color: #16a34a; }
    .text-warning { color: #ca8a04; }
    .text-danger { color: #dc2626; }
    .totals-row { 
      background: #f5f5f5; 
      font-weight: bold;
    }
    @media print {
      body { padding: 20px; }
      .stats-grid { grid-template-columns: repeat(4, 1fr); }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">
      ${salonLogoUrl ? `<img src="${salonLogoUrl}" alt="${displayName}" />` : ''}
      <span>${displayName}</span>
    </div>
    <div class="date-range">${dateRangeStr}</div>
  </div>

  <h2>Summary</h2>
  <div class="stats-grid">
    <div class="stat-box">
      <div class="stat-value">$${stats.totalRevenue.toFixed(2)}</div>
      <div class="stat-label">Total Revenue</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">${stats.wastePercent.toFixed(1)}%</div>
      <div class="stat-label">Waste</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">$${stats.avgServiceCost.toFixed(2)}</div>
      <div class="stat-label">Avg Service Cost</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">${stats.netMargin.toFixed(1)}%</div>
      <div class="stat-label">Net Margin</div>
    </div>
  </div>

  ${stylistData.length > 0 ? `
  <h2>Stylist Performance</h2>
  <table>
    <thead>
      <tr>
        <th>Stylist</th>
        <th class="text-center">Services</th>
        <th class="text-right">Product Cost</th>
        <th class="text-right">Gross Revenue</th>
        <th class="text-right">Net Profit</th>
        <th class="text-center">Waste %</th>
      </tr>
    </thead>
    <tbody>
      ${stylistData.map(s => `
        <tr>
          <td>${s.name}</td>
          <td class="text-center">${s.services}</td>
          <td class="text-right">$${s.productCost.toFixed(2)}</td>
          <td class="text-right">$${s.grossRevenue.toFixed(2)}</td>
          <td class="text-right text-success">$${s.netProfit.toFixed(2)}</td>
          <td class="text-center ${s.waste < 3 ? 'text-success' : s.waste <= 5 ? 'text-warning' : 'text-danger'}">${s.waste.toFixed(1)}%</td>
        </tr>
      `).join('')}
      <tr class="totals-row">
        <td>TOTAL</td>
        <td class="text-center">${stylistData.reduce((sum, s) => sum + s.services, 0)}</td>
        <td class="text-right">$${stylistData.reduce((sum, s) => sum + s.productCost, 0).toFixed(2)}</td>
        <td class="text-right">$${stylistData.reduce((sum, s) => sum + s.grossRevenue, 0).toFixed(2)}</td>
        <td class="text-right text-success">$${stylistData.reduce((sum, s) => sum + s.netProfit, 0).toFixed(2)}</td>
        <td class="text-center">${(stylistData.reduce((sum, s) => sum + s.waste, 0) / stylistData.length).toFixed(1)}%</td>
      </tr>
    </tbody>
  </table>
  ` : ''}

  ${categoryData.length > 0 ? `
  <h2>Product Usage by Category</h2>
  <table>
    <thead>
      <tr>
        <th>Category / Product</th>
        <th class="text-right">Amount Used</th>
        <th class="text-right">Cost</th>
        <th class="text-center">Waste %</th>
      </tr>
    </thead>
    <tbody>
      ${categoryData.map(c => `
        <tr class="font-bold">
          <td>${c.category}</td>
          <td class="text-right">${c.totalAmountUsed.toFixed(1)} ${c.unit}</td>
          <td class="text-right">$${c.totalCost.toFixed(2)}</td>
          <td class="text-center ${c.waste < 3 ? 'text-success' : c.waste <= 5 ? 'text-warning' : 'text-danger'}">${c.waste.toFixed(1)}%</td>
        </tr>
        ${c.products.map(p => `
          <tr>
            <td style="padding-left: 30px">${p.name}</td>
            <td class="text-right">${p.amountUsed.toFixed(1)} ${p.unit}</td>
            <td class="text-right">$${p.cost.toFixed(2)}</td>
            <td class="text-center">${p.waste.toFixed(1)}%</td>
          </tr>
        `).join('')}
      `).join('')}
    </tbody>
  </table>
  ` : ''}

  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 11px; color: #999; text-align: center;">
    Generated by ${displayName} • ${new Date().toLocaleDateString()}
  </div>
</body>
</html>
  `;
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
