import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Upload, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { useCatalogsAdmin } from "@/hooks/platform/useProductCatalogAdmin";
import {
  parseCSV,
  validateProducts,
  useBulkImportProducts,
  generateCSVTemplate,
  type ParsedProduct,
} from "@/hooks/platform/useBulkCatalogImport";

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkImportDialog({ open, onOpenChange }: BulkImportDialogProps) {
  const [csvText, setCsvText] = useState("");
  const [delimiter, setDelimiter] = useState<"," | "\t">(",");
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>("");
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
  const [validationErrors, setValidationErrors] = useState<{ row: number; message: string }[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const { data: catalogs } = useCatalogsAdmin();
  const bulkImport = useBulkImportProducts();

  const handleParse = () => {
    const products = parseCSV(csvText, delimiter);
    const { valid, errors } = validateProducts(products);
    setParsedProducts(products);
    setValidationErrors(errors);
    setShowPreview(true);
  };

  const handleImport = async () => {
    if (!selectedCatalogId) return;

    const result = await bulkImport.mutateAsync({
      catalogId: selectedCatalogId,
      products: parsedProducts,
    });

    if (result.success > 0) {
      setCsvText("");
      setParsedProducts([]);
      setValidationErrors([]);
      setShowPreview(false);
      onOpenChange(false);
    }
  };

  const handleDownloadTemplate = () => {
    const template = generateCSVTemplate();
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "product_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setCsvText("");
    setParsedProducts([]);
    setValidationErrors([]);
    setShowPreview(false);
  };

  const validCount = parsedProducts.length - validationErrors.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Import Products
          </DialogTitle>
          <DialogDescription>
            Import multiple products at once using CSV or TSV format
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Catalog Selection */}
          <div className="space-y-2">
            <Label>Target Catalog</Label>
            <Select value={selectedCatalogId} onValueChange={setSelectedCatalogId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a catalog to import into" />
              </SelectTrigger>
              <SelectContent>
                {catalogs?.filter((c) => c.is_active).map((catalog) => (
                  <SelectItem key={catalog.id} value={catalog.id}>
                    {catalog.brand} - {catalog.line}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Format Selection */}
          <div className="flex items-center gap-4">
            <div className="space-y-2">
              <Label>Format</Label>
              <Select value={delimiter} onValueChange={(v) => setDelimiter(v as "," | "\t")}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=",">CSV (comma)</SelectItem>
                  <SelectItem value={"\t"}>TSV (tab)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="mt-6">
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
          </div>

          {/* CSV Input */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Paste CSV/TSV Data
            </Label>
            <Textarea
              placeholder={`type,name,shade,default_size,default_size_unit,suggested_cost_per_unit
color,Permanent Color,6N,60,ml,0.15
color,Permanent Color,7N,60,ml,0.15
developer,20 Volume Developer,,946,ml,0.02`}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Required columns: type, name. Optional: shade, default_size, default_size_unit, suggested_cost_per_unit
            </p>
          </div>

          {/* Parse Button */}
          <div className="flex gap-2">
            <Button onClick={handleParse} disabled={!csvText.trim()}>
              Preview Import
            </Button>
            {showPreview && (
              <Button variant="outline" onClick={handleReset}>
                Reset
              </Button>
            )}
          </div>

          {/* Preview Table */}
          {showPreview && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Badge variant={validCount > 0 ? "default" : "destructive"}>
                  <CheckCircle className="mr-1 h-3 w-3" />
                  {validCount} valid
                </Badge>
                {validationErrors.length > 0 && (
                  <Badge variant="destructive">
                    <AlertCircle className="mr-1 h-3 w-3" />
                    {validationErrors.length} errors
                  </Badge>
                )}
              </div>

              {validationErrors.length > 0 && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
                  <h4 className="font-medium text-destructive mb-2">Validation Errors</h4>
                  <ul className="text-sm space-y-1">
                    {validationErrors.slice(0, 5).map((error, i) => (
                      <li key={i} className="text-destructive">
                        Row {error.row}: {error.message}
                      </li>
                    ))}
                    {validationErrors.length > 5 && (
                      <li className="text-muted-foreground">
                        ...and {validationErrors.length - 5} more errors
                      </li>
                    )}
                  </ul>
                </div>
              )}

              <div className="border rounded-md max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Shade</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Cost/Unit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedProducts.slice(0, 20).map((product, i) => {
                      const hasError = validationErrors.some((e) => e.row === i + 2);
                      return (
                        <TableRow key={i} className={hasError ? "bg-destructive/10" : ""}>
                          <TableCell className="text-muted-foreground">{i + 2}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{product.type}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>{product.shade || "—"}</TableCell>
                          <TableCell>
                            {product.default_size
                              ? `${product.default_size} ${product.default_size_unit || "ml"}`
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {product.suggested_cost_per_unit
                              ? `$${product.suggested_cost_per_unit.toFixed(2)}`
                              : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {parsedProducts.length > 20 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          ...and {parsedProducts.length - 20} more products
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Import Button */}
          {showPreview && validCount > 0 && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={!selectedCatalogId || bulkImport.isPending}
              >
                {bulkImport.isPending ? "Importing..." : `Import ${validCount} Products`}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
