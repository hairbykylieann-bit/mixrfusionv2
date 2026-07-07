import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ChevronDown, ChevronUp, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Product } from "@/hooks/useProducts";
import type { StockSuggestion } from "@/lib/reports/usageVelocity";
import { describeVelocity } from "@/lib/reports/usageVelocity";

interface Props {
  products: Product[];
  suggestions: Map<string, StockSuggestion>;
  canManage: boolean;
  onApply: (productId: string, reorderLevel: number, targetStock: number) => void;
  isApplying?: boolean;
}

const containerWord = (type: string) =>
  type === "Developer" ? "bottles" : type === "Lightener" ? "tubs" : "tubes";

export function SmartStockCard({ products, suggestions, canManage, onApply, isApplying }: Props) {
  const [expanded, setExpanded] = useState(false);

  // Products worth surfacing: running out soon OR levels differ from usage reality
  const rows = products
    .map((p) => ({ p, s: suggestions.get(p.id) }))
    .filter((r): r is { p: Product; s: StockSuggestion } => !!r.s)
    .filter(({ s }) => (s.daysUntilOut !== null && s.daysUntilOut <= 21) || s.differsFromCurrent)
    .sort((a, b) => (a.s.daysUntilOut ?? 9999) - (b.s.daysUntilOut ?? 9999));

  if (rows.length === 0) return null;

  const visible = expanded ? rows : rows.slice(0, 5);

  return (
    <motion.div
      className="stat-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-medium text-foreground">Smart Stock</h3>
          <p className="text-sm text-muted-foreground">
            Based on what your salon actually mixed in the last 90 days
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {visible.map(({ p, s }) => {
          const word = containerWord(p.type);
          const urgent = s.daysUntilOut !== null && s.daysUntilOut <= 7;
          return (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">
                    {p.shade ? `${p.shade} — ` : ""}{p.name}
                  </p>
                  {urgent && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                      {s.daysUntilOut! <= 0 ? "out" : `~${s.daysUntilOut}d left`}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {p.brand} · {describeVelocity(s, word)}
                </p>
                <p className="text-xs text-foreground mt-0.5">
                  Keep <span className="font-semibold">{s.suggestedTargetStock}</span> on hand,
                  reorder at <span className="font-semibold">{s.suggestedReorderLevel}</span>
                  {s.differsFromCurrent && (
                    <span className="text-muted-foreground"> (now {p.targetStock} / {p.reorderLevel})</span>
                  )}
                </p>
              </div>
              {canManage && s.differsFromCurrent && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isApplying}
                  onClick={() => onApply(p.id, s.suggestedReorderLevel, s.suggestedTargetStock)}
                  className="shrink-0 gap-1"
                >
                  <Check className="w-3.5 h-3.5" /> Apply
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {rows.length > 5 && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full gap-1 text-muted-foreground"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>Show less <ChevronUp className="w-4 h-4" /></>
          ) : (
            <>Show all {rows.length} <ChevronDown className="w-4 h-4" /></>
          )}
        </Button>
      )}
    </motion.div>
  );
}
