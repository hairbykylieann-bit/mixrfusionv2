import { Package, Percent, CircleDollarSign, DollarSign, TrendingUp, Wallet, Tag } from "lucide-react";
import { useSalonSettings } from "@/hooks/useSalonSettings";
import type { StaffReportSummary } from "@/hooks/useStaffReport";

interface StaffRevenueBreakdownProps {
  summary: StaffReportSummary;
  canViewCosts: boolean;
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
  negative,
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
          emphasis ? 'bg-green-500/20' : negative ? 'bg-destructive/10' : 'bg-secondary'
        }`}>
          <Icon className={`w-3.5 h-3.5 ${
            emphasis ? 'text-green-500' : negative ? 'text-destructive' : 'text-muted-foreground'
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
        emphasis ? 'text-green-500 text-lg' : negative ? 'text-destructive' : 'text-foreground'
      }`}>
        {formatted}
      </p>
    </div>
  );
}

export function StaffRevenueBreakdown({ summary, canViewCosts }: StaffRevenueBreakdownProps) {
  const { settings } = useSalonSettings();

  if (!canViewCosts) {
    return (
      <div className="stat-card">
        <h3 className="text-lg font-medium text-foreground mb-4">Revenue Summary</h3>
        <div className="text-center py-8 text-muted-foreground">
          <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Revenue details are restricted.</p>
          <p className="text-sm">Contact your manager to view financial data.</p>
        </div>
      </div>
    );
  }

  const backbarMultiplier = settings?.backbar_multiplier ?? 4;
  const bowlFee = settings?.bowl_fee ?? 2.50;
  const productCost = summary.productCost;
  const serviceRevenue = summary.serviceRevenue || 0;
  const overageRevenue = summary.overageRevenue || 0;
  const hasServiceRevenue = serviceRevenue > 0;
  const productCharge = hasServiceRevenue
    ? overageRevenue
    : productCost * backbarMultiplier;
  const bowlFeeRevenue = summary.bowlFeeRevenue;
  const totalCharged = summary.grossRevenue;
  const netProfit = summary.netAfterProduct;

  const productCostPercent = totalCharged > 0 ? (productCost / totalCharged) * 100 : 0;
  const costHealthColor = productCostPercent <= 12 ? 'text-green-500' : productCostPercent <= 15 ? 'text-yellow-500' : 'text-destructive';
  const costHealthBg = productCostPercent <= 12 ? 'bg-green-500' : productCostPercent <= 15 ? 'bg-yellow-500' : 'bg-destructive';

  const profitPercent = totalCharged > 0 ? (netProfit / totalCharged) * 100 : 0;

  const productChargeLabel = hasServiceRevenue
    ? `Overage Charges (${backbarMultiplier}× on extra product)`
    : `Product Charge (${backbarMultiplier}× cost)`;

  return (
    <div className="stat-card">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
          <DollarSign className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Revenue Breakdown</h3>
          <p className="text-sm text-muted-foreground">The full picture, top to bottom</p>
        </div>
      </div>

      {totalCharged > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-destructive font-medium">
              ~{(100 - profitPercent).toFixed(0)}% product cost · ${productCost.toFixed(2)}
            </span>
            <span className="text-green-500 font-medium">
               ~{profitPercent.toFixed(0)}% salon keeps · ${netProfit.toFixed(2)}
            </span>
          </div>
          <div className="h-1 rounded-full bg-destructive/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${Math.min(profitPercent, 100)}%` }}
            />
          </div>
        </div>
      )}

      <SectionHeader>What Clients Paid</SectionHeader>
      <LineItem
        label="Total Charged to Clients"
        value={totalCharged}
        description="Product cost + markup + bowl fees"
        icon={DollarSign}
      />

      <div className="border-t border-border my-3" />

      <SectionHeader>How That Breaks Down</SectionHeader>
      {hasServiceRevenue && (
        <LineItem
          label="Service Revenue"
          value={serviceRevenue}
          description="Base service prices charged to clients"
          icon={Tag}
        />
      )}
      <LineItem
        label="Product Cost (wholesale)"
        value={productCost}
        description="Total wholesale cost of all products used in service"
        icon={Package}
      />
      <LineItem
        label={productChargeLabel}
        value={productCharge}
        description={hasServiceRevenue
          ? "Markup on product used beyond service allotment"
          : `${backbarMultiplier}× multiplier on product cost`}
        icon={Percent}
      />
      <LineItem
        label="Bowl Fees"
        value={bowlFeeRevenue}
        description={`${summary.bowlCount} bowl${summary.bowlCount !== 1 ? 's' : ''} × $${bowlFee.toFixed(2)}`}
        icon={CircleDollarSign}
      />

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

      <div className="border-t border-border my-3" />
      <SectionHeader>Salon Keeps</SectionHeader>
      <LineItem
        label="Salon Profit from This Stylist"
        value={netProfit}
        description="Revenue minus wholesale product cost"
        icon={TrendingUp}
        emphasis
      />
    </div>
  );
}
