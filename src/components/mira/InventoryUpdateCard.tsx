import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Check, Loader2, Package, X } from "lucide-react";
import { motion } from "framer-motion";
import type { InventoryProposal, InventoryStatus } from "@/hooks/useMiraInventory";

interface InventoryUpdateCardProps {
  proposal: InventoryProposal;
  status: InventoryStatus;
  onChange: (productId: string, newStock: number) => void;
  onRemove: (productId: string) => void;
  onApply: () => void;
  onCancel: () => void;
}

export function InventoryUpdateCard({
  proposal,
  status,
  onChange,
  onRemove,
  onApply,
  onCancel,
}: InventoryUpdateCardProps) {
  const applying = status === "applying";
  const empty = proposal.updates.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border bg-muted/40 p-3"
    >
      <div className="mb-3 flex items-center gap-2">
        <Package className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Inventory updates to review</span>
      </div>

      {empty ? (
        <p className="px-1 py-3 text-sm text-muted-foreground">
          I couldn't match anything to your products. Try again with brand and shade.
        </p>
      ) : (
        <div className="space-y-2">
          {proposal.updates.map((row) => {
            const lowConfidence = row.confidence < 0.6;
            return (
              <div
                key={row.productId}
                className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {lowConfidence && (
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                    )}
                    <p className="truncate text-sm font-medium">{row.matchedName}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Was {row.currentStock} →
                  </p>
                </div>
                <Input
                  type="number"
                  step="0.25"
                  min="0"
                  value={row.newStock}
                  onChange={(e) => onChange(row.productId, parseFloat(e.target.value) || 0)}
                  disabled={applying}
                  className="h-8 w-20 text-sm"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0"
                  onClick={() => onRemove(row.productId)}
                  disabled={applying}
                  aria-label="Remove row"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {proposal.unmatched.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          <p className="font-medium">Couldn't match:</p>
          <p>{proposal.unmatched.join(", ")}</p>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onCancel}
          disabled={applying}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          className="flex-1"
          onClick={onApply}
          disabled={applying || empty}
        >
          {applying ? (
            <>
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              Applying...
            </>
          ) : (
            <>
              <Check className="mr-1 h-3.5 w-3.5" />
              Approve & update
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
