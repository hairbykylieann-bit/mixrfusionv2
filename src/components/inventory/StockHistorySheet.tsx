import { format } from "date-fns";
import { History, Package, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useStockAdjustments, StockAdjustment } from "@/hooks/useStockAdjustments";
import { Product } from "@/hooks/useProducts";

interface StockHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

const reasonLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  received_order: { label: "Received Order", variant: "default" },
  service_usage: { label: "Service Usage", variant: "secondary" },
  manual_correction: { label: "Manual Correction", variant: "outline" },
  damaged: { label: "Damaged", variant: "destructive" },
  returned: { label: "Returned", variant: "secondary" },
  initial_stock: { label: "Initial Stock", variant: "outline" },
};

function AdjustmentItem({ adjustment }: { adjustment: StockAdjustment }) {
  const reason = reasonLabels[adjustment.reason] || { label: adjustment.reason, variant: "outline" as const };
  const isPositive = adjustment.change_amount > 0;
  
  return (
    <div className="flex items-start gap-4 py-4 border-b border-border/50 last:border-0">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
        isPositive ? "bg-success/10" : "bg-destructive/10"
      }`}>
        {isPositive ? (
          <ArrowUp className="w-5 h-5 text-success" />
        ) : (
          <ArrowDown className="w-5 h-5 text-destructive" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`font-semibold ${isPositive ? "text-success" : "text-destructive"}`}>
            {isPositive ? "+" : ""}{adjustment.change_amount}
          </span>
          <Badge variant={reason.variant} className="text-xs">
            {reason.label}
          </Badge>
        </div>
        
        <p className="text-sm text-muted-foreground">
          {adjustment.previous_stock} → {adjustment.new_stock} units
        </p>
        
        {adjustment.notes && (
          <p className="text-sm text-foreground mt-1">
            {adjustment.notes}
          </p>
        )}
        
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          {adjustment.staff?.name && (
            <span>by {adjustment.staff.name}</span>
          )}
          <span>•</span>
          <span>{format(new Date(adjustment.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
        </div>
      </div>
    </div>
  );
}

export function StockHistorySheet({ open, onOpenChange, product }: StockHistorySheetProps) {
  const { adjustments, isLoading } = useStockAdjustments(product?.id);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Stock History
          </SheetTitle>
          {product && (
            <SheetDescription>
              {product.brand} • {product.shade || product.name}
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : adjustments.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium text-foreground mb-2">No history yet</h3>
              <p className="text-sm text-muted-foreground">
                Stock adjustments will appear here when made.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="pr-4">
                {adjustments.map((adjustment) => (
                  <AdjustmentItem key={adjustment.id} adjustment={adjustment} />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
