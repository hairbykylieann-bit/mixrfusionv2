import { motion } from "framer-motion";
import { DollarSign, Package, Percent, CircleDollarSign, TrendingUp, Users, Loader2, Briefcase } from "lucide-react";
import { useSalonSettings } from "@/hooks/useSalonSettings";
import type { ReportStats } from "@/hooks/useReportsData";

interface RevenueBreakdownCardProps {
  stats: ReportStats;
  isLoading: boolean;
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
      {children}
    </p>
  );
}

function LineItem({ 
  label, 
  value, 
  description, 
  icon: Icon, 
  emphasis, 
  negative 
}: { 
  label: string; 
  value: number; 
  description?: string; 
  icon: React.ElementType; 
  emphasis?: boolean;
  negative?: boolean;
}) {
  const formatted = `${negative ? '-' : ''}$${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-3">
        <div className={`w-7 h-7 rounded-md flex items-center justify-center ${
          emphasis ? 'bg-success/20' : negative ? 'bg-destructive/10' : 'bg-secondary'
        }`}>
          <Icon className={`w-3.5 h-3.5 ${
            emphasis ? 'text-success' : negative ? 'text-destructive' : 'text-muted-foreground'
          }`} />
        </div>
        <div>
          <p className={`text-sm ${emphasis ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
            {label}
          </p>
          {description && (
            <p className="text-xs text-muted-foreground/70">{description}</p>
          )}
        </div>
      </div>
      <p className={`font-semibold tabular-nums ${
        emphasis ? 'text-success text-lg' : negative ? 'text-destructive' : 'text-foreground'
      }`}>
        {formatted}
      </p>
    </div>
  );
}

export function RevenueBreakdownCard({ stats, isLoading: statsLoading }: RevenueBreakdownCardProps) {
  const { settings, isLoading: settingsLoading } = useSalonSettings();

  const isLoading = statsLoading || settingsLoading;

  if (isLoading || !settings) {
    return (
      <motion.div
        className="stat-card"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Revenue Breakdown</h3>
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </motion.div>
    );
  }

  // Use pre-calculated values from stats — never recalculate
  const productCost = stats.totalProductCost;
  const totalCharged = stats.totalRevenue;
  const serviceRevenue = stats.serviceRevenue;
  const overageRevenue = stats.overageRevenue;
  const bowlFeeRevenue = stats.bowlFeeRevenue;
  const markupRevenue = stats.markupRevenue;
  const hasServiceRevenue = serviceRevenue > 0;
  const backbarMultiplier = settings.backbar_multiplier ?? 4;

  const netProfit = totalCharged - productCost;
  const { totalCommissionPaid, profitAfterCommission, commissionByStaff } = stats;

  // Product cost as % of revenue (target 8-12%)
  const productCostPercent = totalCharged > 0 ? (productCost / totalCharged) * 100 : 0;
  const costHealthColor = productCostPercent <= 12 ? 'text-success' : productCostPercent <= 15 ? 'text-warning' : 'text-destructive';
  const costHealthBg = productCostPercent <= 12 ? 'bg-success' : productCostPercent <= 15 ? 'bg-warning' : 'bg-destructive';

  // Visual split bar: cost vs profit proportion
  const profitPercent = totalCharged > 0 ? (netProfit / totalCharged) * 100 : 0;

  const productChargeLabel = hasServiceRevenue
    ? `Overage Charges (${backbarMultiplier}× on extra product)`
    : `Product Charge (${backbarMultiplier}× cost)`;

  const productChargeValue = hasServiceRevenue ? overageRevenue : markupRevenue;

  return (
    <motion.div
      className="stat-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
          <DollarSign className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Revenue Breakdown</h3>
          <p className="text-sm text-muted-foreground">The full picture, top to bottom</p>
        </div>
      </div>

      {/* Split bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-destructive font-medium">
            ~{(100 - profitPercent).toFixed(0)}% product cost · ${productCost.toFixed(2)}
          </span>
          <span className="text-success font-medium">
            ~{profitPercent.toFixed(0)}% you keep · ${netProfit.toFixed(2)}
          </span>
        </div>
        <div className="h-1 rounded-full bg-destructive/20 overflow-hidden">
          <div
            className="h-full rounded-full bg-success transition-all"
            style={{ width: `${Math.min(profitPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Section: What Clients Paid */}
      <SectionHeader>What Clients Paid</SectionHeader>
      <LineItem
        label="Total Charged to Clients"
        value={totalCharged}
        description={hasServiceRevenue 
          ? "Service prices + overage + bowl fees" 
          : "Product cost + markup + bowl fees"}
        icon={DollarSign}
      />

      <div className="border-t border-border my-3" />

      {/* Section: How That Breaks Down */}
      <SectionHeader>How That Breaks Down</SectionHeader>
      <LineItem
        label="Product COGS (wholesale)"
        value={productCost}
        description="What you paid for products used"
        icon={Package}
      />
      {hasServiceRevenue && (
        <LineItem
          label="Labor Charge"
          value={stats.laborCharge}
          description="Service-fee portion that pays stylist time (commission comes out of this)"
          icon={Briefcase}
        />
      )}
      <LineItem
        label={productChargeLabel}
        value={productChargeValue}
        description={hasServiceRevenue
          ? "Markup on product used beyond service allotment"
          : `${backbarMultiplier}× multiplier on product cost`}
        icon={Percent}
      />
      <LineItem
        label="Bowl Fees"
        value={bowlFeeRevenue}
        description={`${stats.bowlCount} bowl${stats.bowlCount !== 1 ? 's' : ''} × $${(settings.bowl_fee ?? 2.50).toFixed(2)}`}
        icon={CircleDollarSign}
      />

      {hasServiceRevenue && (
        <p className="text-[11px] text-muted-foreground/70 px-1 -mt-1 mb-2 leading-snug">
          Labor + product markup + bowl fees add up to what you charged the client.
          Commissions (if any) are paid from Labor below.
        </p>
      )}

      {/* Product Cost Health */}
      <div className="flex items-center justify-between py-2 mt-1">
        <span className="text-sm text-muted-foreground">Product Cost % of Revenue</span>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${costHealthColor}`}>{productCostPercent.toFixed(1)}%</span>
          <span className="text-xs text-muted-foreground">target 8-12%</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden mb-1">
        <div className={`h-full rounded-full transition-all ${costHealthBg}`} style={{ width: `${Math.min(productCostPercent * 3, 100)}%` }} />
      </div>

      {/* Section: Commissions */}
      {commissionByStaff.length > 0 && (
        <>
          <div className="border-t border-border my-3" />
          <SectionHeader>Commissions Paid Out</SectionHeader>
          {commissionByStaff.map((entry) => (
            <LineItem
              key={entry.name}
              label={`${entry.name} (${entry.rate}%)`}
              value={entry.amount}
              icon={Users}
              negative
            />
          ))}
          <div className="flex items-center justify-between py-2 border-t border-border/50 mt-1">
            <span className="text-sm font-medium text-muted-foreground">Total Commissions</span>
            <span className="font-semibold text-destructive tabular-nums">
              -${totalCommissionPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </>
      )}

      {/* Section: Salon Keeps */}
      <div className="border-t border-border my-3" />
      <SectionHeader>Salon Keeps</SectionHeader>
      <LineItem
        label={commissionByStaff.length > 0 ? "Profit After Commissions" : "Net Profit"}
        value={commissionByStaff.length > 0 ? profitAfterCommission : netProfit}
        description={commissionByStaff.length > 0 ? "Markup + bowl fees − commissions" : "Markup + bowl fees"}
        icon={TrendingUp}
        emphasis
      />
    </motion.div>
  );
}
