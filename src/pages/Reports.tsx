import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  DollarSign, 
  TrendingUp, 
  ChevronDown,
  ChevronRight,
  Palette,
  Droplets,
  Sun,
  Heart,
  Loader2,
  Users,
  Package,
  BarChart3,
  Info
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip } from "recharts";
import { Header } from "@/components/layout/Header";
import { PageLayout } from "@/components/layout/PageLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangeSelector, type DateRange, getDateRangeFromPreset } from "@/components/reports/DateRangeSelector";
import { useReportsData, type StylistReportData, type CategoryReportData, type ReportStats } from "@/hooks/useReportsData";
import { useSalonSettings } from "@/hooks/useSalonSettings";
import { getUnitLabel } from "@/lib/unitConversion";

import { ExportButton } from "@/components/reports/ExportButton";
import { PerServiceAverageCard } from "@/components/reports/PerServiceAverageCard";
import { AccessDenied } from "@/components/reports/AccessDenied";
import { useEffectiveStaff } from "@/hooks/useEffectiveStaff";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function getWasteColor(waste: number): string {
  if (waste < 3) return "text-success";
  if (waste <= 5) return "text-warning";
  return "text-destructive";
}

const WASTE_HELP = "Waste % = (Amount Mixed − Amount Used) ÷ Amount Mixed. Totals are weighted by amount mixed, so high-volume stylists and products affect the average more.";

function WasteHeaderLabel() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 cursor-help">
            Waste %
            <Info className="w-3 h-3 text-muted-foreground" />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">{WASTE_HELP}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function getCategoryIcon(category: string) {
  switch (category) {
    case 'Color': return Palette;
    case 'Developer': return Droplets;
    case 'Lightener': return Sun;
    case 'Treatment': return Heart;
    default: return Palette;
  }
}

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  index: number;
  isLoading?: boolean;
  tooltip?: string;
}

function StatCard({ label, value, icon: Icon, index, isLoading, tooltip }: StatCardProps) {
  return (
    <motion.div
      className="stat-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
          <Icon className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>
      {isLoading ? (
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      ) : (
        <>
          <p className="text-3xl font-semibold text-foreground">{value}</p>
          {tooltip ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-sm text-muted-foreground mt-1 inline-flex items-center gap-1 cursor-help">
                    {label}
                    <Info className="w-3 h-3" />
                  </p>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">{tooltip}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">{label}</p>
          )}
        </>
      )}
    </motion.div>
  );
}

interface StylistsTableProps {
  data: StylistReportData[];
  isLoading: boolean;
  showCosts: boolean;
}

function StylistsTable({ data, isLoading, showCosts }: StylistsTableProps) {
  if (isLoading) {
    return (
      <motion.div
        className="stat-card flex items-center justify-center h-64"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </motion.div>
    );
  }

  if (data.length === 0) {
    return (
      <motion.div
        className="stat-card flex items-center justify-center h-64"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="text-center text-muted-foreground">
          <p>No stylist data available for this period</p>
        </div>
      </motion.div>
    );
  }

  const totalMixedG = data.reduce((sum, s) => sum + (s.totalMixedG || 0), 0);
  const totalUsedG = data.reduce((sum, s) => sum + (s.totalUsedG || 0), 0);
  const totals = {
    services: data.reduce((sum, s) => sum + s.services, 0),
    productCost: data.reduce((sum, s) => sum + s.productCost, 0),
    grossRevenue: data.reduce((sum, s) => sum + s.grossRevenue, 0),
    netProfit: data.reduce((sum, s) => sum + s.netProfit, 0),
    commissionEarned: data.reduce((sum, s) => sum + s.commissionEarned, 0),
    salonKeeps: data.reduce((sum, s) => sum + s.salonKeeps, 0),
    waste: totalMixedG > 0 ? ((totalMixedG - totalUsedG) / totalMixedG) * 100 : 0,
  };

  return (
    <motion.div
      className="stat-card overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <Table className="min-w-[600px]">
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="text-muted-foreground font-medium">Stylist</TableHead>
              <TableHead className="text-muted-foreground font-medium text-center">Services</TableHead>
              {showCosts && (
                <TableHead className="text-muted-foreground font-medium text-right">Charged to Clients</TableHead>
              )}
              {showCosts && (
                <TableHead className="text-muted-foreground font-medium text-right">Product Cost</TableHead>
              )}
              {showCosts && (
                <TableHead className="text-muted-foreground font-medium text-right">Markup + Fees</TableHead>
              )}
              {showCosts && (
                <TableHead className="text-muted-foreground font-medium text-right">Commission</TableHead>
              )}
              {showCosts && (
                <TableHead className="text-muted-foreground font-medium text-right">Salon Keeps</TableHead>
              )}
              <TableHead className="text-muted-foreground font-medium text-center"><WasteHeaderLabel /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((stylist) => (
              <TableRow key={stylist.id} className="border-border/50">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                      <span className="text-xs font-medium text-foreground">{stylist.initials}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{stylist.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {stylist.bowlCount} bowl{stylist.bowlCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center text-foreground">{stylist.services}</TableCell>
                {showCosts && (
                  <TableCell className="text-right text-foreground">
                    ${stylist.grossRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                )}
                {showCosts && (
                  <TableCell className="text-right text-muted-foreground">
                    ${stylist.productCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                )}
                {showCosts && (
                  <TableCell className="text-right font-semibold text-success">
                    ${stylist.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                )}
                {showCosts && (
                  <TableCell className="text-right text-foreground">
                    {stylist.receivesCommission
                      ? `-$${stylist.commissionEarned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${stylist.commissionRate}%)`
                      : '—'
                    }
                  </TableCell>
                )}
                {showCosts && (
                  <TableCell className="text-right font-semibold text-success">
                    ${stylist.salonKeeps.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                )}
                <TableCell className={`text-center font-medium ${getWasteColor(stylist.waste)}`}>
                  {stylist.waste.toFixed(1)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter className="bg-secondary/50">
            <TableRow className="border-border/50 hover:bg-secondary/70">
              <TableCell className="font-semibold text-foreground">Totals</TableCell>
              <TableCell className="text-center font-semibold text-foreground">{totals.services}</TableCell>
              {showCosts && (
                <TableCell className="text-right font-semibold text-foreground">
                  ${totals.grossRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
              )}
              {showCosts && (
                <TableCell className="text-right font-semibold text-muted-foreground">
                  ${totals.productCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
              )}
              {showCosts && (
                <TableCell className="text-right font-semibold text-success">
                  ${totals.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
              )}
              {showCosts && (
                <TableCell className="text-right font-semibold text-foreground">
                  -${totals.commissionEarned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
              )}
              {showCosts && (
                <TableCell className="text-right font-semibold text-success">
                  ${totals.salonKeeps.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
              )}
              <TableCell className={`text-center font-semibold ${getWasteColor(totals.waste)}`}>
                {totals.waste.toFixed(1)}%
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </motion.div>
  );
}

interface ProductsTableProps {
  data: CategoryReportData[];
  isLoading: boolean;
  showCosts: boolean;
  unitLabel: string;
}




function ProductsTable({ data, isLoading, showCosts, unitLabel }: ProductsTableProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  if (isLoading) {
    return (
      <motion.div
        className="stat-card flex items-center justify-center h-64"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </motion.div>
    );
  }

  if (data.length === 0) {
    return (
      <motion.div
        className="stat-card flex items-center justify-center h-64"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="text-center text-muted-foreground">
          <p>No product data available for this period</p>
        </div>
      </motion.div>
    );
  }

  // Check if all categories share the same unit
  const allUnits = data.map(c => c.unit);
  const sameUnit = allUnits.every(u => u === allUnits[0]);

  const totalMixedG = data.reduce((sum, c) => sum + (c.totalMixedG || 0), 0);
  const totalUsedG = data.reduce((sum, c) => sum + (c.totalUsedG || 0), 0);
  const categoryTotals = {
    productsCount: data.reduce((sum, c) => sum + c.products.length, 0),
    totalAmountUsed: sameUnit ? data.reduce((sum, c) => sum + c.totalAmountUsed, 0) : null,
    totalAmountMixed: sameUnit ? data.reduce((sum, c) => sum + c.totalAmountMixed, 0) : null,
    totalCost: data.reduce((sum, c) => sum + c.totalCost, 0),
    waste: totalMixedG > 0 ? ((totalMixedG - totalUsedG) / totalMixedG) * 100 : 0,
  };

  return (
    <motion.div
      className="stat-card overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <Table className="min-w-[600px]">
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="text-muted-foreground font-medium w-8"></TableHead>
              <TableHead className="text-muted-foreground font-medium">Category</TableHead>
              <TableHead className="text-muted-foreground font-medium text-right">Amount Mixed</TableHead>
              <TableHead className="text-muted-foreground font-medium text-right">Amount Used</TableHead>
              {showCosts && (
                <TableHead className="text-muted-foreground font-medium text-right">Cost</TableHead>
              )}
              <TableHead className="text-muted-foreground font-medium text-center"><WasteHeaderLabel /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((category) => {
              const Icon = getCategoryIcon(category.category);
              const isExpanded = expandedCategories.includes(category.id);
              
              return (
                <>
                  <TableRow 
                    key={category.id} 
                    className="border-border/50 cursor-pointer hover:bg-secondary/50 transition-colors"
                    onClick={() => toggleCategory(category.id)}
                  >
                    <TableCell className="w-8">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                          <Icon className="w-4 h-4 text-foreground" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{category.category}</span>
                          <span className="text-xs text-muted-foreground">{category.products.length} products</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground font-medium">
                      {category.totalAmountMixed.toFixed(1)} {category.unit}
                    </TableCell>
                    <TableCell className="text-right text-foreground font-medium">
                      {category.totalAmountUsed.toFixed(1)} {category.unit}
                    </TableCell>
                    {showCosts && (
                      <TableCell className="text-right text-foreground font-medium">
                        ${category.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                    )}
                    <TableCell className={`text-center font-medium ${getWasteColor(category.waste)}`}>
                      {category.waste.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                  
                  <AnimatePresence>
                    {isExpanded && category.products.map((product) => (
                      <motion.tr
                        key={product.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-secondary/30 border-border/30"
                      >
                        <TableCell></TableCell>
                        <TableCell className="pl-14">
                          <span className="text-sm text-foreground">{product.name}</span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm">
                          {product.amountMixed.toFixed(1)} {product.unit}
                        </TableCell>
                        <TableCell className="text-right text-foreground text-sm">
                          {product.amountUsed.toFixed(1)} {product.unit}
                        </TableCell>
                        {showCosts && (
                          <TableCell className="text-right text-foreground text-sm">
                            ${product.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                        )}
                        <TableCell className={`text-center text-sm ${getWasteColor(product.waste)}`}>
                          {product.waste.toFixed(1)}%
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </>
              );
            })}
          </TableBody>
          <TableFooter className="bg-secondary/50">
            <TableRow className="border-border/50 hover:bg-secondary/70">
              <TableCell></TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-semibold text-foreground">Totals</span>
                  <span className="text-xs text-muted-foreground">{categoryTotals.productsCount} products</span>
                </div>
              </TableCell>
              <TableCell className="text-right font-semibold text-muted-foreground">
                {categoryTotals.totalAmountMixed !== null ? `${categoryTotals.totalAmountMixed.toFixed(1)} ${unitLabel}` : '—'}
              </TableCell>
              <TableCell className="text-right font-semibold text-foreground">
                {categoryTotals.totalAmountUsed !== null ? `${categoryTotals.totalAmountUsed.toFixed(1)} ${unitLabel}` : '—'}
              </TableCell>
              {showCosts && (
                <TableCell className="text-right font-semibold text-foreground">
                  ${categoryTotals.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
              )}
              <TableCell className={`text-center font-semibold ${getWasteColor(categoryTotals.waste)}`}>
                {categoryTotals.waste.toFixed(1)}%
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </motion.div>
  );
}

export default function Reports() {
  const [dateRange, setDateRange] = useState<DateRange>(() => getDateRangeFromPreset('last30days'));
  const { stats, stylistReports, categoryReports, isLoading } = useReportsData(dateRange);
  const { effectiveStaff, isLoading: staffLoading } = useEffectiveStaff();
  const { settings } = useSalonSettings();
  const displayUnit = settings?.preferred_display_unit || "g";
  const unitLabel = getUnitLabel(displayUnit);

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
  };

  // Show loading while checking permissions
  if (staffLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <PageLayout title="Reports" subtitle="Track performance and insights">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        </PageLayout>
      </div>
    );
  }

  // Block access if user lacks permission
  if (!effectiveStaff?.permissions.can_view_reports) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <PageLayout title="Reports" subtitle="Access Denied">
          <AccessDenied 
            title="Reports Access Restricted"
            message="You don't have permission to view reports. Contact your salon owner."
          />
        </PageLayout>
      </div>
    );
  }

  const isOwner = effectiveStaff.role === "owner";
  const showCosts = effectiveStaff.permissions.can_view_product_costs;

  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const markupEarned = stats.totalRevenue - stats.totalProductCost - stats.bowlFeeRevenue;
  const netProfit = stats.totalRevenue - stats.totalProductCost - stats.totalCommissionPaid;


  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <PageLayout
        title="Reports"
        subtitle="Track performance and insights"
        action={
          <div className="flex items-center gap-2">
            {isOwner && (
              <ExportButton
                stats={stats}
                stylistData={stylistReports}
                categoryData={categoryReports}
                dateRange={dateRange}
                disabled={isLoading}
              />
            )}
            <DateRangeSelector onDateRangeChange={handleDateRangeChange} />
          </div>
        }
      >
        {/* KPI Stat Tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Revenue Charged"
            value={isLoading ? "..." : fmt(stats.totalRevenue)}
            icon={DollarSign}
            index={0}
            isLoading={isLoading}
            tooltip="Total amount charged to clients for color services (product + labor + bowl fees) during this date range."
          />
          <StatCard
            label="Color Services"
            value={isLoading ? "..." : stats.sessionCount.toString()}
            icon={BarChart3}
            index={1}
            isLoading={isLoading}
            tooltip="Number of color sessions completed in this date range."
          />
          <StatCard
            label="Avg per Service"
            value={isLoading ? "..." : fmt(stats.avgServiceCost)}
            icon={TrendingUp}
            index={2}
            isLoading={isLoading}
            tooltip="Average amount charged per color service (Revenue Charged ÷ Color Services)."
          />
          <StatCard
            label="Product Waste"
            value={isLoading ? "..." : `${stats.wastePercent.toFixed(1)}%`}
            icon={Droplets}
            index={3}
            isLoading={isLoading}
            tooltip="Percent of mixed product that wasn't used. Lower is better — under 5% is healthy."
          />
        </div>

        {/* Charts Row */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Revenue Breakdown Donut */}
            <motion.div
              className="stat-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Revenue Breakdown</p>
              {(() => {
                const pieData = [
                  { name: 'Product Cost', value: stats.totalProductCost, color: '#6366f1' },
                  ...(stats.totalCommissionPaid > 0 ? [{ name: 'Commissions', value: stats.totalCommissionPaid, color: '#f97316' }] : []),
                  { name: 'Salon Profit', value: Math.max(netProfit, 0), color: '#10b981' },
                ].filter(d => d.value > 0);

                if (pieData.length === 0) {
                  return (
                    <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                      No revenue data for this period
                    </div>
                  );
                }

                return (
                  <div className="flex flex-col items-center">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            color: 'hsl(var(--foreground))',
                            fontSize: '12px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap justify-center gap-4 mt-2">
                      {pieData.map((entry) => (
                        <div key={entry.name} className="flex items-center gap-2 text-xs">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                          <span className="text-muted-foreground">{entry.name}</span>
                          <span className="font-medium text-foreground">{fmt(entry.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </motion.div>

            {/* Operational Health */}
            <motion.div
              className="stat-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Operational Health</p>
              {(() => {
                const costPct = stats.totalRevenue > 0 ? (stats.totalProductCost / stats.totalRevenue) * 100 : 0;
                const wasteVal = stats.wastePercent;
                const wasteBarColor = wasteVal < 3 ? 'hsl(var(--success))' : wasteVal <= 5 ? '#f59e0b' : 'hsl(var(--destructive))';
                const costBarColor = costPct <= 12 ? 'hsl(var(--success))' : costPct <= 15 ? '#f59e0b' : 'hsl(var(--destructive))';

                const healthData = [
                  { name: 'Waste %', value: parseFloat(wasteVal.toFixed(1)), target: 5, fill: wasteBarColor },
                  { name: 'Cost %', value: parseFloat(costPct.toFixed(1)), target: 12, fill: costBarColor },
                ];

                return (
                  <div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={healthData} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
                        <XAxis type="number" domain={[0, 20]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }} axisLine={false} tickLine={false} width={60} />
                        <RechartsTooltip
                          formatter={(value: number, name: string) => [`${value}%`, name]}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            color: 'hsl(var(--foreground))',
                            fontSize: '12px',
                          }}
                        />
                        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={28}>
                          {healthData.map((entry, index) => (
                            <Cell key={`bar-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex justify-around mt-2 text-xs text-muted-foreground">
                      <span>Waste target: &lt;5%</span>
                      <span>Cost target: 8–12%</span>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}

        {/* Financial Summary — receipt-style at-a-glance card */}
        <motion.div
          className="stat-card mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-5">Financial Summary</p>

              {/* What Clients Paid */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">What Clients Paid</p>
                  <p className="text-xs text-muted-foreground/70">Services + product charges + bowl fees</p>
                </div>
                <p className="text-lg font-semibold text-foreground tabular-nums">{fmt(stats.totalRevenue)}</p>
              </div>

              {/* What Product Cost You */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">What Product Cost You</p>
                  <p className="text-xs text-muted-foreground/70">Wholesale cost of everything mixed</p>
                </div>
                <p className="text-lg font-semibold text-destructive tabular-nums">-{fmt(stats.totalProductCost)}</p>
              </div>

              {/* What You Earned on Product */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">What You Earned on Product</p>
                  <p className="text-xs text-muted-foreground/70">The difference between what you charged and what product cost</p>
                </div>
                <p className="text-lg font-semibold text-foreground tabular-nums">{fmt(markupEarned)}</p>
              </div>

              {/* Bowl Fees Collected */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Bowl Fees Collected</p>
                  <p className="text-xs text-muted-foreground/70">{stats.bowlCount} bowl{stats.bowlCount !== 1 ? 's' : ''} × ${(settings?.bowl_fee ?? 2.50).toFixed(2)}</p>
                </div>
                <p className="text-lg font-semibold text-foreground tabular-nums">{fmt(stats.bowlFeeRevenue)}</p>
              </div>

              {/* Commission Paid Out — only when commissions exist */}
              {stats.totalCommissionPaid > 0 && (
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">Commission Paid Out</p>
                    <p className="text-xs text-muted-foreground/70">Paid to stylists</p>
                  </div>
                  <p className="text-lg font-semibold text-destructive tabular-nums">-{fmt(stats.totalCommissionPaid)}</p>
                </div>
              )}

              {/* Divider + YOUR PROFIT */}
              <div className="border-t border-border my-3" />
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-semibold text-success uppercase tracking-wide">Your Profit</p>
                  <p className="text-xs text-muted-foreground/70">What the salon actually keeps</p>
                </div>
                <p className="text-xl font-bold text-success tabular-nums">{fmt(netProfit)}</p>
              </div>

              {/* Health Metrics */}
              <div className="border-t border-border my-3" />

              {/* Waste % */}
              {(() => {
                const wasteVal = stats.wastePercent;
                const wasteColor = getWasteColor(wasteVal);
                const wasteBg = wasteVal < 3 ? 'bg-success' : wasteVal <= 5 ? 'bg-warning' : 'bg-destructive';
                return (
                  <div className="py-2">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <p className="text-sm font-medium text-foreground">Waste</p>
                        <p className="text-xs text-muted-foreground/70">Product mixed but not used</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${wasteColor}`}>{wasteVal.toFixed(1)}%</span>
                        <span className="text-xs text-muted-foreground">target &lt;5%</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${wasteBg}`} style={{ width: `${Math.min(wasteVal * 10, 100)}%` }} />
                    </div>
                  </div>
                );
              })()}

              {/* Product Cost % of Revenue */}
              {(() => {
                const costPct = stats.totalRevenue > 0 ? (stats.totalProductCost / stats.totalRevenue) * 100 : 0;
                const costColor = costPct <= 12 ? 'text-success' : costPct <= 15 ? 'text-warning' : 'text-destructive';
                const costBg = costPct <= 12 ? 'bg-success' : costPct <= 15 ? 'bg-warning' : 'bg-destructive';
                return (
                  <div className="py-2 mt-1">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <p className="text-sm font-medium text-foreground">Product Cost vs Revenue</p>
                        <p className="text-xs text-muted-foreground/70">How much of revenue goes to product</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${costColor}`}>{costPct.toFixed(1)}%</span>
                        <span className="text-xs text-muted-foreground">target 8-12%</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${costBg}`} style={{ width: `${Math.min(costPct * 3, 100)}%` }} />
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </motion.div>

        {showCosts && <PerServiceAverageCard stats={stats} isLoading={isLoading} />}



        

        <Tabs defaultValue="stylists" className="w-full">
          <TabsList className="bg-secondary mb-6">
            <TabsTrigger value="stylists">Stylists</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
          </TabsList>
          
          <TabsContent value="stylists">
            <StylistsTable data={stylistReports} isLoading={isLoading} showCosts={showCosts} />
          </TabsContent>
          
          <TabsContent value="products">
            <ProductsTable data={categoryReports} isLoading={isLoading} showCosts={showCosts} unitLabel={unitLabel} />
          </TabsContent>
        </Tabs>
      </PageLayout>
    </div>
  );
}
