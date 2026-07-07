import { useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Camera, FileText, Loader2, Check, AlertTriangle, Package, Minus, Plus, RotateCcw } from "lucide-react";
import { useReceiptScanner, ScannedItem } from "@/hooks/useReceiptScanner";
import { cn } from "@/lib/utils";

interface ReceiptScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReceiptScanner({ open, onOpenChange }: ReceiptScannerProps) {
  const scanner = useReceiptScanner();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) scanner.scanFile(file);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) scanner.reset();
    onOpenChange(isOpen);
  };

  const matchedCount = scanner.items.filter((i) => i.matched_product && !i.skip).length;
  const unmatchedCount = scanner.items.filter((i) => !i.matched_product).length;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            Scan Receipt
          </SheetTitle>
          <SheetDescription>
            Upload a photo or PDF of your order receipt to auto-restock inventory.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* UPLOAD STEP */}
          {scanner.step === "upload" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Camera className="w-10 h-10 text-primary" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="font-semibold text-foreground text-lg">Upload Receipt</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Take a photo of your order receipt or upload a PDF invoice. AI will match items to your inventory.
                </p>
              </div>

              {scanner.error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3 w-full max-w-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {scanner.error}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,application/pdf"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />

              <div className="flex flex-col gap-3 w-full max-w-xs">
                <Button size="lg" className="gap-2 w-full" onClick={() => fileInputRef.current?.click()}>
                  <Camera className="w-5 h-5" />
                  Take Photo or Upload
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Supports JPG, PNG, WebP images and PDF files
                </p>
              </div>
            </div>
          )}

          {/* SCANNING STEP */}
          {scanner.step === "scanning" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
              {scanner.previewUrl && (
                <img
                  src={scanner.previewUrl}
                  alt="Receipt"
                  className="w-48 h-48 object-cover rounded-xl border border-border"
                />
              )}
              {!scanner.previewUrl && scanner.fileName && (
                <div className="w-48 h-48 rounded-xl border border-border flex flex-col items-center justify-center bg-muted/30">
                  <FileText className="w-12 h-12 text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground truncate max-w-[160px]">{scanner.fileName}</p>
                </div>
              )}
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm font-medium text-foreground">Scanning receipt…</p>
                <p className="text-xs text-muted-foreground">AI is reading your receipt and matching products</p>
              </div>
            </div>
          )}

          {/* REVIEW STEP */}
          {scanner.step === "review" && (
            <>
              <div className="px-6 py-3 border-b border-border bg-muted/30 flex items-center gap-3">
                <Badge variant="secondary" className="gap-1">
                  <Check className="w-3 h-3" />
                  {matchedCount} matched
                </Badge>
                {unmatchedCount > 0 && (
                  <Badge variant="outline" className="gap-1 text-warning border-warning/30">
                    <AlertTriangle className="w-3 h-3" />
                    {unmatchedCount} unmatched
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground ml-auto">
                  {scanner.items.length} items found
                </span>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                  {scanner.items.map((item, index) => (
                    <ReceiptItemCard
                      key={index}
                      item={item}
                      onUpdate={(updates) => scanner.updateItem(index, updates)}
                    />
                  ))}
                </div>
              </ScrollArea>

              <div className="p-4 border-t border-border space-y-3">
                <Button
                  className="w-full gap-2"
                  size="lg"
                  onClick={scanner.applyAll}
                  disabled={matchedCount === 0}
                >
                  <Package className="w-5 h-5" />
                  Restock {matchedCount} Product{matchedCount !== 1 ? "s" : ""}
                </Button>
                <Button variant="outline" className="w-full gap-2" onClick={scanner.reset}>
                  <RotateCcw className="w-4 h-4" />
                  Scan Another
                </Button>
              </div>
            </>
          )}

          {/* APPLYING STEP */}
          {scanner.step === "applying" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm font-medium text-foreground">Updating inventory…</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ReceiptItemCard({
  item,
  onUpdate,
}: {
  item: ScannedItem;
  onUpdate: (updates: Partial<ScannedItem>) => void;
}) {
  const hasMatch = !!item.matched_product;
  const mp = item.matched_product;

  const confidenceColor = {
    high: "text-success",
    medium: "text-warning",
    low: "text-destructive",
  }[item.confidence];

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-opacity",
        item.skip ? "opacity-50 bg-muted/20 border-border" : "bg-card border-border",
        !hasMatch && "border-warning/40 bg-warning/5"
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={!item.skip && hasMatch}
          onCheckedChange={(checked) => onUpdate({ skip: !checked })}
          disabled={!hasMatch}
          className="mt-1"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{item.receipt_description}</p>
          {hasMatch && mp ? (
            <div className="mt-1 space-y-1">
              <p className="text-xs text-muted-foreground">
                → {mp.brand} {mp.shade || mp.name}
              </p>
              <div className="flex items-center gap-2 text-xs">
                <span className={cn("font-medium", confidenceColor)}>
                  {item.confidence} confidence
                </span>
                <span className="text-muted-foreground">
                  Current: {mp.current_stock} → {mp.current_stock + item.editedQuantity}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-warning mt-1">No matching product found</p>
          )}
        </div>

        {hasMatch && !item.skip && (
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => onUpdate({ editedQuantity: Math.max(1, item.editedQuantity - 1) })}
            >
              <Minus className="w-3 h-3" />
            </Button>
            <Input
              type="number"
              value={item.editedQuantity}
              onChange={(e) => onUpdate({ editedQuantity: Math.max(1, parseInt(e.target.value) || 1) })}
              className="w-14 h-7 text-center text-sm px-1"
              min={1}
            />
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => onUpdate({ editedQuantity: item.editedQuantity + 1 })}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
