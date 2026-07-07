import { useState } from "react";
import { Plus, Minus, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Product } from "@/hooks/useProducts";

export type AdjustmentReason = 
  | "received_order" 
  | "service_usage" 
  | "manual_correction" 
  | "damaged" 
  | "returned";

interface QuickStockAdjustmentProps {
  product: Product;
  onAdjust: (
    productId: string, 
    newStock: number, 
    reason: AdjustmentReason, 
    notes?: string
  ) => void;
  disabled?: boolean;
}

const reasonLabels: Record<AdjustmentReason, string> = {
  received_order: "Received Order",
  service_usage: "Service Usage",
  manual_correction: "Manual Correction",
  damaged: "Damaged",
  returned: "Returned",
};

export function QuickStockAdjustment({ 
  product, 
  onAdjust, 
  disabled = false 
}: QuickStockAdjustmentProps) {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState<AdjustmentReason>("received_order");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const newStock = Math.max(0, product.stock + quantity);

  const handleQuickAdjust = (delta: number) => {
    setQuantity((prev) => {
      const newVal = prev + delta;
      // Don't allow resulting stock to go below 0
      if (product.stock + newVal < 0) {
        return -product.stock;
      }
      return newVal;
    });
  };

  const handleSave = async () => {
    if (quantity === 0) return;
    
    setIsSubmitting(true);
    try {
      await onAdjust(product.id, newStock, reason, notes || undefined);
      setOpen(false);
      // Reset form
      setQuantity(0);
      setReason("received_order");
      setNotes("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      // Reset when closing
      setQuantity(0);
      setReason("received_order");
      setNotes("");
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={disabled}
          onClick={(e) => e.stopPropagation()}
        >
          <Package className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80" 
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Quick Stock Adjustment</h4>
            <p className="text-xs text-muted-foreground">
              {product.brand} • {product.shade || product.name}
            </p>
          </div>

          {/* Current Stock Display */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Current Stock</p>
              <p className="text-2xl font-semibold">{parseFloat(Number(product.stock).toFixed(2))}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">New Stock</p>
              <p className={`text-2xl font-semibold ${
                quantity > 0 ? "text-success" : 
                quantity < 0 ? "text-destructive" : ""
              }`}>
                {parseFloat(Number(newStock).toFixed(2))}
              </p>
            </div>
          </div>

          {/* Quick Adjust Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleQuickAdjust(-0.25)}
              disabled={product.stock + quantity <= 0}
            >
              <Minus className="w-4 h-4" />
            </Button>
            <Input
              type="number"
              step="0.25"
              value={quantity}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                if (product.stock + val >= 0) {
                  setQuantity(val);
                }
              }}
              className="text-center"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleQuickAdjust(0.25)}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Reason Selector */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as AdjustmentReason)}>
              <SelectTrigger id="reason">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(reasonLabels) as AdjustmentReason[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {reasonLabels[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Optional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Save Button */}
          <Button 
            className="w-full" 
            onClick={handleSave}
            disabled={quantity === 0 || isSubmitting}
          >
            {isSubmitting ? "Saving..." : `Save Adjustment (${quantity >= 0 ? "+" : ""}${quantity})`}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
