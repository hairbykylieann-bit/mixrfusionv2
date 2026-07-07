import { useState, useMemo } from "react";
import { ClipboardCopy, Download, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Product } from "@/hooks/useProducts";
import type { StockSuggestion } from "@/lib/reports/usageVelocity";
import { describeVelocity } from "@/lib/reports/usageVelocity";

interface ReorderItem {
  product: Product;
  selected: boolean;
  orderQty: number;
}

interface ReorderReportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  suggestions?: Map<string, StockSuggestion>;
  isOwner?: boolean;
  contextLabel?: string | null;
}

export function ReorderReportSheet({ open, onOpenChange, products, isOwner = false, contextLabel , suggestions }: ReorderReportSheetProps) {
  const lowStockProducts = useMemo(
    () => products.filter(p => p.status === "low" || p.status === "out"),
    [products]
  );

  const [reorderItems, setReorderItems] = useState<ReorderItem[]>(() =>
    lowStockProducts.map(product => ({
      product,
      selected: true,
      // Order back up to the salon's target stock (whole containers).
      // Falls back to clearing the reorder threshold if no target is set.
      orderQty: Math.max(
        Math.ceil((product.targetStock || product.reorderLevel + 2) - product.stock),
        1
      ),
    }))
  );

  // Update reorder items when products change
  useMemo(() => {
    setReorderItems(
      lowStockProducts.map(product => {
        const existing = reorderItems.find(item => item.product.id === product.id);
        return existing || {
          product,
          selected: true,
          // Order back up to the salon's target stock (whole containers).
      // Falls back to clearing the reorder threshold if no target is set.
      orderQty: Math.max(
        Math.ceil((product.targetStock || product.reorderLevel + 2) - product.stock),
        1
      ),
        };
      })
    );
  }, [lowStockProducts]);

  const toggleItem = (id: string) => {
    setReorderItems(items =>
      items.map(item =>
        item.product.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const toggleAll = (checked: boolean) => {
    setReorderItems(items => items.map(item => ({ ...item, selected: checked })));
  };

  const updateOrderQty = (id: string, qty: number) => {
    setReorderItems(items =>
      items.map(item =>
        item.product.id === id ? { ...item, orderQty: Math.max(0, qty) } : item
      )
    );
  };

  const selectedItems = reorderItems.filter(item => item.selected);
  const allSelected = reorderItems.length > 0 && reorderItems.every(item => item.selected);

  const generateReportData = () => {
    const headers = ["Brand", "Product Line", "Shade", "Product Name", "Current Stock", "Reorder Level", "Order Qty"];
    const rows = selectedItems.map(item => [
      item.product.brand,
      item.product.line,
      item.product.shade,
      item.product.name,
      item.product.stock.toString(),
      item.product.reorderLevel.toString(),
      item.orderQty.toString(),
    ]);
    return { headers, rows };
  };

  const copyToClipboard = async () => {
    const { headers, rows } = generateReportData();
    const text = [
      headers.join("\t"),
      ...rows.map(row => row.join("\t")),
    ].join("\n");

    await navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: `${selectedItems.length} items ready to paste into a spreadsheet`,
    });
  };

  const downloadCSV = () => {
    const { headers, rows } = generateReportData();
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reorder-report-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "CSV downloaded",
      description: `${selectedItems.length} items exported to CSV`,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {contextLabel ? `${contextLabel} — Reorder Report` : "Reorder Report"}
          </SheetTitle>
          <SheetDescription>
            {lowStockProducts.length} items need reordering{contextLabel ? ` in ${contextLabel}` : ""}. Select items and adjust quantities, then export to send to your supplier.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {lowStockProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>All products are well stocked!</p>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-10">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={toggleAll}
                        />
                      </TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-center w-20">Stock</TableHead>
                      <TableHead className="text-center w-24">Order Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reorderItems.map(item => (
                      <TableRow key={item.product.id} className={!item.selected ? "opacity-50" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={item.selected}
                            onCheckedChange={() => toggleItem(item.product.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {item.product.brand} • {item.product.line}
                            </p>
                            <p className="font-medium">
                              {item.product.shade ? `${item.product.shade} - ` : ""}{item.product.name}
                            </p>
                            {suggestions?.get(item.product.id) && (
                              <p className="text-xs text-muted-foreground">
                                {describeVelocity(suggestions.get(item.product.id)!)}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={item.product.stock === 0 ? "text-destructive font-medium" : "text-warning font-medium"}>
                            {parseFloat(Number(item.product.stock).toFixed(2))}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            value={item.orderQty}
                            onChange={e => updateOrderQty(item.product.id, parseInt(e.target.value) || 0)}
                            className="w-20 text-center h-8"
                            disabled={!item.selected}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 p-3 rounded-lg bg-muted/30 text-sm text-muted-foreground">
                <strong className="text-foreground">{selectedItems.length}</strong> items selected for order
              </div>

              {isOwner ? (
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={copyToClipboard}
                    disabled={selectedItems.length === 0}
                  >
                    <ClipboardCopy className="w-4 h-4" />
                    Copy to Clipboard
                  </Button>
                  <Button
                    className="flex-1 gap-2"
                    onClick={downloadCSV}
                    disabled={selectedItems.length === 0}
                  >
                    <Download className="w-4 h-4" />
                    Download CSV
                  </Button>
                </div>
              ) : (
                <p className="mt-6 text-sm text-muted-foreground text-center">
                  Contact your salon owner to export this report.
                </p>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
