import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ChevronRight,
  ChevronDown,
  Package,
  Loader2,
  Import,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  useProductCatalogs,
  useCatalogProducts,
  useImportCatalogProducts,
  type ProductCatalog,
  type CatalogProduct,
} from "@/hooks/useProductCatalogs";
import { ImportPricingStep } from "./ImportPricingStep";

interface ProductCatalogBrowserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductCatalogBrowser({ open, onOpenChange }: ProductCatalogBrowserProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCatalog, setExpandedCatalog] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [selectedProductsData, setSelectedProductsData] = useState<CatalogProduct[]>([]);
  const [showPricingStep, setShowPricingStep] = useState(false);

  const { data: catalogs = [], isLoading: catalogsLoading } = useProductCatalogs();
  const { data: catalogProducts = [], isLoading: productsLoading } = useCatalogProducts(expandedCatalog);
  const importMutation = useImportCatalogProducts();

  // Filter catalogs by search query
  const filteredCatalogs = useMemo(() => {
    if (!searchQuery) return catalogs;
    const query = searchQuery.toLowerCase();
    return catalogs.filter(
      (c) =>
        c.brand.toLowerCase().includes(query) ||
        c.line.toLowerCase().includes(query)
    );
  }, [catalogs, searchQuery]);

  // Group catalogs by brand
  const groupedCatalogs = useMemo(() => {
    const groups: Record<string, ProductCatalog[]> = {};
    filteredCatalogs.forEach((catalog) => {
      if (!groups[catalog.brand]) {
        groups[catalog.brand] = [];
      }
      groups[catalog.brand].push(catalog);
    });
    return groups;
  }, [filteredCatalogs]);

  const handleToggleCatalog = (catalogId: string) => {
    setExpandedCatalog(expandedCatalog === catalogId ? null : catalogId);
  };

  const handleToggleProduct = (product: CatalogProduct) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(product.id)) {
        next.delete(product.id);
        setSelectedProductsData((prevData) => prevData.filter((p) => p.id !== product.id));
      } else {
        next.add(product.id);
        setSelectedProductsData((prevData) => [...prevData, product]);
      }
      return next;
    });
  };

  const handleSelectAllInCatalog = (products: CatalogProduct[]) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      const allSelected = products.every((p) => next.has(p.id));
      if (allSelected) {
        products.forEach((p) => next.delete(p.id));
        setSelectedProductsData((prevData) => prevData.filter((d) => !products.some((p) => p.id === d.id)));
      } else {
        products.forEach((p) => next.add(p.id));
        const newProducts = products.filter((p) => !selectedProductsData.some((d) => d.id === p.id));
        setSelectedProductsData((prevData) => [...prevData, ...newProducts]);
      }
      return next;
    });
  };

  const handleStartImport = () => {
    if (selectedProducts.size === 0) return;
    setShowPricingStep(true);
  };

  const handleImportWithPricing = async (pricing: Record<string, number>) => {
    try {
      await importMutation.mutateAsync({
        productIds: Array.from(selectedProducts),
        defaultStock: 0,
        pricing,
      });

      setSelectedProducts(new Set());
      setSelectedProductsData([]);
      setShowPricingStep(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Import failed:", error);
    }
  };

  const handleClose = () => {
    setSelectedProducts(new Set());
    setSelectedProductsData([]);
    setExpandedCatalog(null);
    setSearchQuery("");
    setShowPricingStep(false);
    onOpenChange(false);
  };

  // Pricing step view
  if (showPricingStep) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
          <ImportPricingStep
            selectedProducts={selectedProductsData}
            catalogs={catalogs}
            onBack={() => setShowPricingStep(false)}
            onImport={handleImportWithPricing}
            isImporting={importMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Browse Product Catalogs
          </DialogTitle>
          <DialogDescription>
            Select products from professional brands to add to your inventory.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search brands or product lines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Catalog List */}
        <div className="flex-1 min-h-0 -mx-6 px-6 overflow-y-auto max-h-[calc(85vh-240px)]">
          {catalogsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : Object.keys(groupedCatalogs).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No product catalogs available yet.</p>
              <p className="text-sm mt-1">Check back soon for new brands!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedCatalogs).map(([brand, brandCatalogs]) => (
                <div key={brand} className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                    {brand}
                  </h3>
                  <div className="space-y-1">
                    {brandCatalogs.map((catalog) => (
                      <div key={catalog.id}>
                        {/* Catalog Row */}
                        <button
                          onClick={() => handleToggleCatalog(catalog.id)}
                          className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-secondary transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            {expandedCatalog === catalog.id ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                            <div>
                              <p className="font-medium text-foreground">{catalog.line}</p>
                              {catalog.description && (
                                <p className="text-xs text-muted-foreground">{catalog.description}</p>
                              )}
                            </div>
                          </div>
                          <Badge variant="secondary">{catalog.product_count} products</Badge>
                        </button>

                        {/* Expanded Products */}
                        <AnimatePresence>
                          {expandedCatalog === catalog.id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="ml-7 mt-1 p-3 bg-secondary/30 rounded-lg space-y-2">
                                {productsLoading ? (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Loading products...
                                  </div>
                                ) : catalogProducts.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">No products in this catalog</p>
                                ) : (
                                  <>
                                    {/* Select All */}
                                    <div className="flex items-center gap-2 pb-2 border-b border-border">
                                      <Checkbox
                                        checked={catalogProducts.every((p) => selectedProducts.has(p.id))}
                                        onCheckedChange={() => handleSelectAllInCatalog(catalogProducts)}
                                      />
                                      <span className="text-sm font-medium">Select all</span>
                                    </div>

                                    {/* Product List */}
                                    <div className="max-h-48 overflow-y-auto space-y-1">
                                      {catalogProducts.map((product) => (
                                        <label
                                          key={product.id}
                                          className="flex items-center gap-3 p-2 rounded hover:bg-secondary/50 cursor-pointer"
                                        >
                                          <Checkbox
                                            checked={selectedProducts.has(product.id)}
                                            onCheckedChange={() => handleToggleProduct(product)}
                                          />
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm text-foreground truncate">
                                              {product.shade && (
                                                <span className="font-medium">{product.shade} - </span>
                                              )}
                                              {product.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                              {product.type} • {product.default_size}{product.default_size_unit}
                                            </p>
                                          </div>
                                        </label>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-muted-foreground">
            {selectedProducts.size > 0 && (
              <span>{selectedProducts.size} product{selectedProducts.size !== 1 ? "s" : ""} selected</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleStartImport}
              disabled={selectedProducts.size === 0}
              className="gap-2"
            >
              <Import className="w-4 h-4" />
              Next: Set Pricing {selectedProducts.size > 0 && `(${selectedProducts.size})`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
