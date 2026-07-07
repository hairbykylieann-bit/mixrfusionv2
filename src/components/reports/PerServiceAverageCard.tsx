import { motion } from "framer-motion";
import { Receipt } from "lucide-react";
import type { ReportStats } from "@/hooks/useReportsData";

interface Props {
  stats: ReportStats;
  isLoading: boolean;
}

const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function PerServiceAverageCard({ stats, isLoading }: Props) {
  if (isLoading || stats.sessionCount === 0) return null;

  const n = stats.sessionCount;
  const avgCharged = stats.totalRevenue / n;
  const avgProductCost = stats.totalProductCost / n;
  const avgBowlFee = stats.bowlFeeRevenue / n;
  const avgSalonKeeps = (stats.totalRevenue - stats.totalProductCost) / n;
  const marginPct = avgCharged > 0 ? (avgSalonKeeps / avgCharged) * 100 : 0;

  return (
    <motion.div
      className="stat-card mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
          <Receipt className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Per-Service Average</h3>
          <p className="text-sm text-muted-foreground">
            What an average color service really earns you — across {n} session{n !== 1 ? 's' : ''}.
          </p>
        </div>
      </div>

      <div className="space-y-1">
        <Row label="Average client charged" value={avgCharged} bold />
        <Row label="Product cost (wholesale)" value={-avgProductCost} muted />
        {avgBowlFee > 0 && (
          <Row label="Bowl fees collected" value={avgBowlFee} muted hint="Salon keeps these to cover bowls, foils, capes" />
        )}
        <div className="border-t border-border my-2" />
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-semibold text-success uppercase tracking-wide">Salon Keeps</p>
            <p className="text-xs text-muted-foreground/70">Per service, after product. Bowl fees included.</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-success tabular-nums">{fmt(avgSalonKeeps)}</p>
            <p className="text-xs text-muted-foreground tabular-nums">{marginPct.toFixed(0)}% margin</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Row({ label, value, bold, muted, hint }: { label: string; value: number; bold?: boolean; muted?: boolean; hint?: string }) {
  const neg = value < 0;
  return (
    <div className="flex items-center justify-between py-1.5">
      <div>
        <p className={`text-sm ${bold ? 'font-semibold text-foreground' : muted ? 'text-muted-foreground' : 'text-foreground'}`}>
          {label}
        </p>
        {hint && <p className="text-xs text-muted-foreground/70">{hint}</p>}
      </div>
      <p className={`tabular-nums ${bold ? 'text-lg font-semibold text-foreground' : neg ? 'text-destructive font-medium' : 'text-foreground font-medium'}`}>
        {neg ? '-' : ''}{fmt(Math.abs(value))}
      </p>
    </div>
  );
}
