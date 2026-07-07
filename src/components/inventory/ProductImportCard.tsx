import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { 
  Upload, 
  FileText, 
  Download, 
  Check, 
  AlertCircle, 
  X,
  Loader2,
  ArrowLeft,
  Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProducts, ProductFormData } from "@/hooks/useProducts";
import { toast } from "sonner";

const VALID_TYPES = ["Color", "Developer", "Lightener", "Treatment"];

interface ParsedProduct {
  type: string;
  brand: string;
  name: string;
  line?: string;
  shade?: string;
  size?: number;
  cost?: number;
  stock?: number;
  reorderLevel?: number;
  targetStock?: number;
}

interface ParseResult {
  valid: ParsedProduct[];
  invalid: { row: number; reason: string }[];
}

interface ProductImportCardProps {
  onBack: () => void;
}

export function ProductImportCard({ onBack }: ProductImportCardProps) {
  const { createManyProducts } = useProducts();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const parseCSV = useCallback((content: string): ParseResult => {
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) {
      return { valid: [], invalid: [{ row: 1, reason: "File is empty or has no data rows" }] };
    }

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    
    // Find column indices
    const typeIndex = headers.findIndex(h => h === 'type');
    const brandIndex = headers.findIndex(h => h === 'brand');
    const nameIndex = headers.findIndex(h => h === 'name');
    const lineIndex = headers.findIndex(h => h === 'line');
    const shadeIndex = headers.findIndex(h => h === 'shade');
    const sizeIndex = headers.findIndex(h => h === 'size');
    const costIndex = headers.findIndex(h => h === 'cost');
    const stockIndex = headers.findIndex(h => h === 'stock');
    const reorderLevelIndex = headers.findIndex(h => h === 'reorder_level' || h === 'reorderlevel');
    const targetStockIndex = headers.findIndex(h => h === 'target_stock' || h === 'targetstock');

    // Validate required headers
    if (typeIndex === -1) {
      return { valid: [], invalid: [{ row: 1, reason: "Missing required 'type' column" }] };
    }
    if (brandIndex === -1) {
      return { valid: [], invalid: [{ row: 1, reason: "Missing required 'brand' column" }] };
    }
    if (nameIndex === -1) {
      return { valid: [], invalid: [{ row: 1, reason: "Missing required 'name' column" }] };
    }

    const valid: ParsedProduct[] = [];
    const invalid: { row: number; reason: string }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      
      const type = values[typeIndex]?.trim();
      const brand = values[brandIndex]?.trim();
      const name = values[nameIndex]?.trim();

      // Validate required fields
      if (!type) {
        invalid.push({ row: i + 1, reason: "Missing required type" });
        continue;
      }

      // Validate type value
      if (!VALID_TYPES.includes(type)) {
        invalid.push({ row: i + 1, reason: `Invalid type "${type}". Must be: ${VALID_TYPES.join(', ')}` });
        continue;
      }

      if (!brand) {
        invalid.push({ row: i + 1, reason: "Missing required brand" });
        continue;
      }

      if (!name) {
        invalid.push({ row: i + 1, reason: "Missing required name" });
        continue;
      }

      const product: ParsedProduct = { type, brand, name };

      // Parse optional fields
      if (lineIndex !== -1 && values[lineIndex]) {
        product.line = values[lineIndex];
      }
      if (shadeIndex !== -1 && values[shadeIndex]) {
        product.shade = values[shadeIndex];
      }
      if (sizeIndex !== -1 && values[sizeIndex]) {
        const size = parseFloat(values[sizeIndex]);
        if (!isNaN(size)) product.size = size;
      }
      if (costIndex !== -1 && values[costIndex]) {
        const cost = parseFloat(values[costIndex]);
        if (!isNaN(cost)) product.cost = cost;
      }
      if (stockIndex !== -1 && values[stockIndex]) {
        const stock = parseInt(values[stockIndex], 10);
        if (!isNaN(stock)) product.stock = stock;
      }
      if (reorderLevelIndex !== -1 && values[reorderLevelIndex]) {
        const level = parseInt(values[reorderLevelIndex], 10);
        if (!isNaN(level)) product.reorderLevel = level;
      }
      if (targetStockIndex !== -1 && values[targetStockIndex]) {
        const target = parseInt(values[targetStockIndex], 10);
        if (!isNaN(target)) product.targetStock = target;
      }

      valid.push(product);
    }

    return { valid, invalid };
  }, []);

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error("Please upload a CSV file");
      return;
    }

    setFile(file);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const result = parseCSV(content);
      setParseResult(result);
    };
    reader.readAsText(file);
  }, [parseCSV]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleFile(selectedFile);
  };

  const handleImport = async () => {
    if (!parseResult?.valid.length) return;

    setIsImporting(true);
    try {
      // Convert parsed products to ProductFormData
      const productsToImport: ProductFormData[] = parseResult.valid.map(p => ({
        type: p.type,
        brand: p.brand,
        name: p.name,
        line: p.line,
        shade: p.shade,
        size: p.size ?? 60,
        sizeUnit: "ml",

        cost: p.cost ?? 0,
        stock: p.stock ?? 0,
        reorderLevel: p.reorderLevel ?? 5,
        targetStock: p.targetStock ?? 20,
        status: "active" as const,
      }));

      await createManyProducts.mutateAsync(productsToImport);
      setImportResult({ success: parseResult.valid.length, failed: parseResult.invalid.length });
      toast.success(`Successfully imported ${parseResult.valid.length} products`);
    } catch (error) {
      toast.error("Failed to import products");
      setImportResult({ success: 0, failed: parseResult.valid.length });
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParseResult(null);
    setImportResult(null);
  };

  const downloadTemplate = () => {
    const template = `type,brand,line,shade,name,size,cost,stock,reorder_level,target_stock
Color,Schwarzkopf,Igora Royal,6-0,Permanent Color,60,8.50,10,5,20
Color,Schwarzkopf,Igora Royal,7-0,Permanent Color,60,8.50,10,5,20
Developer,Schwarzkopf,Igora,20 Vol,Developer,1000,12.00,5,2,10
Lightener,Schwarzkopf,Igora Vario,Blonde Plus,Lightening Powder,450,24.00,3,2,5
Treatment,Olaplex,,No.1,Bond Multiplier,100,35.00,4,2,8`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      className="stat-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border/50 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
          <Upload className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-medium text-foreground">Import Products</h3>
          <p className="text-sm text-muted-foreground">Upload a CSV file to bulk import products</p>
        </div>
      </div>

      {/* Drop Zone */}
      {!file && !importResult && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            isDragging 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:border-primary/50 hover:bg-secondary/50'
          }`}
          onClick={() => document.getElementById('product-csv-input')?.click()}
        >
          <input
            id="product-csv-input"
            type="file"
            accept=".csv"
            onChange={handleFileInput}
            className="hidden"
          />
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-foreground font-medium">Drag & drop your CSV file here</p>
          <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
        </div>
      )}

      {/* Preview */}
      {parseResult && !importResult && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-foreground">{file?.name}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Preview Table */}
          {parseResult.valid.length > 0 && (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="bg-secondary px-4 py-2 text-sm font-medium text-foreground">
                Preview ({parseResult.valid.length} products ready to import)
              </div>
              <div className="max-h-48 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50">
                    <tr>
                      <th className="px-4 py-2 text-left text-muted-foreground">Type</th>
                      <th className="px-4 py-2 text-left text-muted-foreground">Brand</th>
                      <th className="px-4 py-2 text-left text-muted-foreground">Name</th>
                      <th className="px-4 py-2 text-left text-muted-foreground">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parseResult.valid.slice(0, 5).map((product, i) => (
                      <tr key={i} className="border-t border-border/50">
                        <td className="px-4 py-2 text-foreground">{product.type}</td>
                        <td className="px-4 py-2 text-muted-foreground">{product.brand}</td>
                        <td className="px-4 py-2 text-muted-foreground">{product.shade || product.name}</td>
                        <td className="px-4 py-2 text-muted-foreground">{product.stock ?? 0}</td>
                      </tr>
                    ))}
                    {parseResult.valid.length > 5 && (
                      <tr className="border-t border-border/50">
                        <td colSpan={4} className="px-4 py-2 text-center text-muted-foreground">
                          ... and {parseResult.valid.length - 5} more
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Validation Warnings */}
          {parseResult.invalid.length > 0 && (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-warning mb-2">
                <AlertCircle className="w-4 h-4" />
                <span className="font-medium">{parseResult.invalid.length} rows will be skipped</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                {parseResult.invalid.slice(0, 3).map((err, i) => (
                  <li key={i}>Row {err.row}: {err.reason}</li>
                ))}
                {parseResult.invalid.length > 3 && (
                  <li>... and {parseResult.invalid.length - 3} more</li>
                )}
              </ul>
            </div>
          )}

          {/* Import Button */}
          <div className="flex gap-3">
            <Button
              onClick={handleImport}
              disabled={!parseResult.valid.length || isImporting}
              className="flex-1"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Import {parseResult.valid.length} Products
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleReset}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Import Result */}
      {importResult && (
        <div className="space-y-4">
          <div className="bg-success/10 border border-success/30 rounded-lg p-4">
            <div className="flex items-center gap-2 text-success mb-2">
              <Check className="w-5 h-5" />
              <span className="font-medium">Import Complete</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Successfully imported {importResult.success} products
              {importResult.failed > 0 && ` (${importResult.failed} rows skipped)`}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleReset} className="flex-1">
              Import More Products
            </Button>
            <Button onClick={onBack} className="flex-1">
              <Package className="w-4 h-4 mr-2" />
              View Inventory
            </Button>
          </div>
        </div>
      )}

      {/* Template Download */}
      {!importResult && (
        <div className="mt-6 pt-4 border-t border-border/50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              <span>Required: </span>
              <span className="text-foreground">type, brand, name</span>
            </div>
            <Button variant="ghost" size="sm" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Template
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Valid types: Color, Developer, Lightener, Treatment
          </p>
        </div>
      )}
    </motion.div>
  );
}
