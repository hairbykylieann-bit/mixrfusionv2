import { DollarSign, BarChart3, Droplets, Info } from "lucide-react";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { StaffReportSummary, PeriodChanges } from "@/hooks/useStaffReport";

interface StaffReportStatsProps {
  summary: StaffReportSummary;
  changes: PeriodChanges;
  canViewCosts: boolean;
}

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  index: number;
  tooltip?: string;
}

function StatCard({ label, value, icon: Icon, index, tooltip }: StatCardProps) {
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
    </motion.div>
  );
}

export function StaffReportStats({ summary, canViewCosts }: StaffReportStatsProps) {
  const salonProfit = summary.grossRevenue - summary.productCost;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Color Services"
        value={summary.services.toString()}
        icon={BarChart3}
        index={0}
        tooltip="Color sessions this stylist completed in this date range."
      />
      {canViewCosts ? (
        <>
          <StatCard
            label="Revenue Brought In"
            value={`$${summary.grossRevenue.toFixed(2)}`}
            icon={DollarSign}
            index={1}
            tooltip="Total amount this stylist charged clients for color services (product + labor + bowl fees)."
          />
          <StatCard
            label="Salon Profit from This Stylist"
            value={`$${salonProfit.toFixed(2)}`}
            icon={DollarSign}
            index={2}
            tooltip="Revenue minus wholesale product cost. This is what the salon keeps."
          />
        </>
      ) : (
        <>
          <StatCard
            label="Bowls Mixed"
            value={summary.bowlCount.toString()}
            icon={BarChart3}
            index={1}
            tooltip="Total bowls mixed across all color services in this date range."
          />
          <StatCard
            label="Avg Bowls per Service"
            value={`${(summary.bowlCount / Math.max(summary.services, 1)).toFixed(1)}`}
            icon={BarChart3}
            index={2}
            tooltip="Average number of bowls mixed per color service."
          />
        </>
      )}
      <StatCard
        label="Product Waste"
        value={`${summary.wastePercent.toFixed(1)}%`}
        icon={Droplets}
        index={3}
        tooltip="Percent of product this stylist mixed but didn't use. Under 5% is healthy."
      />
    </div>
  );
}
