import { useState, useMemo } from "react";
import { format } from "date-fns";
import { History, ArrowUp, ArrowDown, Loader2, Package, Filter } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAllStockAdjustments, StockAdjustment, AdjustmentReason } from "@/hooks/useStockAdjustments";

interface StockAdjustmentsReportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const reasonLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  received_order: { label: "Received Order", variant: "default" },
  service_usage: { label: "Service Usage", variant: "secondary" },
  manual_correction: { label: "Manual Correction", variant: "outline" },
  damaged: { label: "Damaged", variant: "destructive" },
  returned: { label: "Returned", variant: "secondary" },
  initial_stock: { label: "Initial Stock", variant: "outline" },
};

function AdjustmentRow({ adjustment }: { adjustment: StockAdjustment }) {
  const reason = reasonLabels[adjustment.reason] || { label: adjustment.reason, variant: "outline" as const };
  const isPositive = adjustment.change_amount > 0;

  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
      <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
        isPositive ? "bg-success/10" : "bg-destructive/10"
      }`}>
        {isPositive ? (
          <ArrowUp className="w-4 h-4 text-success" />
        ) : (
          <ArrowDown className="w-4 h-4 text-destructive" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-sm font-medium text-foreground truncate">
            {adjustment.product?.brand} • {adjustment.product?.shade || adjustment.product?.name}
          </span>
          <Badge variant={reason.variant} className="text-xs shrink-0">
            {reason.label}
          </Badge>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <span className={`font-semibold ${isPositive ? "text-success" : "text-destructive"}`}>
            {isPositive ? "+" : ""}{adjustment.change_amount}
          </span>
          <span className="text-muted-foreground">
            {adjustment.previous_stock} → {adjustment.new_stock}
          </span>
        </div>

        {adjustment.notes && (
          <p className="text-xs text-muted-foreground mt-1 truncate">{adjustment.notes}</p>
        )}

        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          {adjustment.staff?.name && <span>by {adjustment.staff.name}</span>}
          <span>•</span>
          <span>{format(new Date(adjustment.created_at), "MMM d, yyyy h:mm a")}</span>
        </div>
      </div>
    </div>
  );
}

export function StockAdjustmentsReport({ open, onOpenChange }: StockAdjustmentsReportProps) {
  const { adjustments, isLoading } = useAllStockAdjustments();
  const [reasonFilter, setReasonFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    if (reasonFilter === "all") return adjustments;
    return adjustments.filter(a => a.reason === reasonFilter);
  }, [adjustments, reasonFilter]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Stock Log
          </SheetTitle>
          <SheetDescription>
            Recent stock adjustments across all products
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 mb-3">
          <Select value={reasonFilter} onValueChange={setReasonFilter}>
            <SelectTrigger className="w-full">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <SelectValue placeholder="Filter by reason" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reasons</SelectItem>
              {Object.entries(reasonLabels).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium text-foreground mb-2">No adjustments found</h3>
            <p className="text-sm text-muted-foreground">
              {reasonFilter !== "all" ? "Try a different filter." : "Stock adjustments will appear here."}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-260px)]">
            <div className="pr-4">
              {filtered.map((adjustment) => (
                <AdjustmentRow key={adjustment.id} adjustment={adjustment} />
              ))}
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}
