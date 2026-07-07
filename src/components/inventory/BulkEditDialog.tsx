import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Product } from "@/hooks/useProducts";

type BulkEditField = "stock" | "reorderLevel" | "targetStock" | "cost";

interface BulkEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProducts: Product[];
  onBulkUpdate: (field: BulkEditField, value: number) => Promise<void>;
  isUpdating: boolean;
  canViewCosts: boolean;
}

export function BulkEditDialog({
  open,
  onOpenChange,
  selectedProducts,
  onBulkUpdate,
  isUpdating,
  canViewCosts,
}: BulkEditDialogProps) {
  const [selectedField, setSelectedField] = useState<BulkEditField>("stock");
  const [value, setValue] = useState("");

  const handleSubmit = async () => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) return;
    
    await onBulkUpdate(selectedField, numValue);
    setValue("");
    onOpenChange(false);
  };

  const fieldLabels: Record<BulkEditField, { label: string; unit: string; placeholder: string }> = {
    stock: { label: "Stock Level", unit: "units", placeholder: "Enter stock quantity" },
    reorderLevel: { label: "Reorder Level", unit: "units", placeholder: "Enter reorder level" },
    targetStock: { label: "Target Stock", unit: "units", placeholder: "Enter target stock" },
    cost: { label: "Cost per Unit", unit: "$", placeholder: "Enter cost" },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Edit ({selectedProducts.length} Products)</DialogTitle>
          <DialogDescription>
            Set the same value for all selected products
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <RadioGroup
            value={selectedField}
            onValueChange={(v) => setSelectedField(v as BulkEditField)}
            className="space-y-3"
          >
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="stock" id="stock" />
              <Label htmlFor="stock" className="font-normal cursor-pointer">
                Stock Level
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="reorderLevel" id="reorderLevel" />
              <Label htmlFor="reorderLevel" className="font-normal cursor-pointer">
                Reorder Level
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="targetStock" id="targetStock" />
              <Label htmlFor="targetStock" className="font-normal cursor-pointer">
                Target Stock
              </Label>
            </div>
            {canViewCosts && (
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="cost" id="cost" />
                <Label htmlFor="cost" className="font-normal cursor-pointer">
                  Cost per Unit
                </Label>
              </div>
            )}
          </RadioGroup>

          <div className="space-y-2">
            <Label htmlFor="value">
              Set {fieldLabels[selectedField].label} to:
            </Label>
            <div className="relative">
              {selectedField === "cost" && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
              )}
              <Input
                id="value"
                type="number"
                min="0"
                step={selectedField === "cost" ? "0.01" : "0.25"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={fieldLabels[selectedField].placeholder}
                className={selectedField === "cost" ? "pl-7" : ""}
              />
              {selectedField !== "cost" && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  {fieldLabels[selectedField].unit}
                </span>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isUpdating || !value || parseFloat(value) < 0}
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              `Apply to ${selectedProducts.length} Products`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
