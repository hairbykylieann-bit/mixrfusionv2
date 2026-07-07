import { CheckCircle2, AlertTriangle, Droplets } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { convertGramsToDisplayUnit, getUnitLabel } from "@/lib/unitConversion";
import type { StaffReportSummary, WasteByCategory } from "@/hooks/useStaffReport";

interface StaffWasteAnalysisProps {
  summary: StaffReportSummary;
  wasteByCategory: WasteByCategory[];
  targetWaste: number;
  canViewCosts: boolean;
  displayUnit?: string;
}

function WasteStatusBadge({ wastePercent, target }: { wastePercent: number; target: number }) {
  const isOnTarget = wastePercent <= target;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
        isOnTarget
          ? "bg-green-500/10 text-green-500"
          : "bg-amber-500/10 text-amber-500"
      )}
    >
      {isOnTarget ? (
        <>
          <CheckCircle2 className="w-4 h-4" />
          On Track
        </>
      ) : (
        <>
          <AlertTriangle className="w-4 h-4" />
          Above Target
        </>
      )}
    </div>
  );
}

function CategoryWasteBar({
  category,
  wastePercent,
  target,
}: {
  category: string;
  wastePercent: number;
  target: number;
}) {
  const normalizedPercent = Math.min(wastePercent, 15); // Cap at 15% for visual
  const progressValue = (normalizedPercent / 15) * 100;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground">{category}</span>
        <span
          className={cn(
            "font-medium",
            wastePercent <= target ? "text-green-500" : wastePercent <= target * 1.5 ? "text-amber-500" : "text-red-500"
          )}
        >
          {wastePercent.toFixed(1)}%
        </span>
      </div>
      <div className="relative">
        <Progress
          value={progressValue}
          className="h-2"
        />
        {/* Target indicator */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-foreground/30"
          style={{ left: `${(target / 15) * 100}%` }}
        />
      </div>
    </div>
  );
}

export function StaffWasteAnalysis({
  summary,
  wasteByCategory,
  targetWaste,
  canViewCosts,
  displayUnit = "g",
}: StaffWasteAnalysisProps) {
  const convertedWaste = convertGramsToDisplayUnit(summary.wasteAmount, displayUnit);
  const unitLabel = getUnitLabel(displayUnit);
  return (
    <div className="space-y-4">
      {/* Summary card */}
      <div className="stat-card">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-medium text-foreground">Waste Overview</h3>
            <p className="text-sm text-muted-foreground">
              Product waste analysis for this period
            </p>
          </div>
          <WasteStatusBadge wastePercent={summary.wastePercent} target={targetWaste} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <Droplets className="w-8 h-8 mx-auto text-primary mb-2" />
            <div className="text-2xl font-bold text-foreground">
              {convertedWaste.toFixed(1)}{unitLabel}
            </div>
            <div className="text-sm text-muted-foreground">Total Waste</div>
          </div>

          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div
              className={cn(
                "text-2xl font-bold",
                summary.wastePercent <= targetWaste
                  ? "text-green-500"
                  : summary.wastePercent <= targetWaste * 1.5
                  ? "text-amber-500"
                  : "text-red-500"
              )}
            >
              {summary.wastePercent.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">Waste Rate</div>
            <div className="text-xs text-muted-foreground mt-1">
              Target: &lt;{targetWaste}%
            </div>
          </div>

          {canViewCosts && (
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-foreground">
                ${summary.wasteValue.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">Waste Value</div>
              <div className="text-xs text-muted-foreground mt-1">at cost</div>
            </div>
          )}
        </div>
      </div>

      {/* Waste by category */}
      {wasteByCategory.length > 0 && (
        <div className="stat-card">
          <h3 className="text-lg font-medium text-foreground mb-4">
            Waste by Category
          </h3>
          <div className="space-y-4">
            {wasteByCategory.map((cat) => (
              <CategoryWasteBar
                key={cat.category}
                category={cat.category}
                wastePercent={cat.wastePercent}
                target={targetWaste}
              />
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-border/50">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span>≤{targetWaste}% (Good)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-amber-500" />
                <span>{targetWaste}-{targetWaste * 1.5}% (Caution)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-500" />
                <span>&gt;{targetWaste * 1.5}% (High)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
