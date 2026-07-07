import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  List, 
  LayoutGrid, 
  Search,
  Package,
  AlertTriangle,
  FileText,
  Loader2,
  ChevronDown,
  Upload,
  Sparkles,
  SlidersHorizontal,
  Camera,
  History
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProductDialog } from "@/components/inventory/ProductDialog";
import { ReorderReportSheet } from "@/components/inventory/ReorderReportSheet";
import { InventorySetupOptions } from "@/components/inventory/InventorySetupOptions";
import { ProductImportCard } from "@/components/inventory/ProductImportCard";
import { ProductCatalogBrowser } from "@/components/inventory/ProductCatalogBrowser";
import { InventoryFilters as InventoryFiltersDropdown, StatusFilter, SortBy } from "@/components/inventory/InventoryFilters";
import { InventoryValueCard } from "@/components/inventory/InventoryValueCard";
import { QuickStockAdjustment, AdjustmentReason } from "@/components/inventory/QuickStockAdjustment";
import { StockHistorySheet } from "@/components/inventory/StockHistorySheet";
import { StockAdjustmentsReport } from "@/components/inventory/StockAdjustmentsReport";
import { BatchActionsBar } from "@/components/inventory/BatchActionsBar";
import { SelectionToolbar } from "@/components/inventory/SelectionToolbar";
import { BulkEditDialog } from "@/components/inventory/BulkEditDialog";
import { ToneNavigator } from "@/components/inventory/ToneNavigator";
import { GroupedProductGrid } from "@/components/inventory/GroupedProductGrid";
import { InventoryBreadcrumb } from "@/components/inventory/InventoryBreadcrumb";
import { ReceiptScanner } from "@/components/inventory/ReceiptScanner";
import { useProducts, Product, ProductFormData } from "@/hooks/useProducts";
import { useStockAdjustments } from "@/hooks/useStockAdjustments";
import { useEffectiveStaff } from "@/hooks/useEffectiveStaff";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";
import { 
  InventoryFilters, 
  defaultInventoryFilters, 
  applyInventoryFilters,
  extractLevel,
  getUniqueValues,
} from "@/lib/inventoryUtils";

const statusConfig = {
  "in-stock": { label: "In Stock", class: "status-in-stock" },
  "low": { label: "Low Stock", class: "status-low" },
  "out": { label: "Out of Stock", class: "status-out" },
};

interface ProductCardProps {
  product: Product;
  index: number;
  onClick: () => void;
  onQuickAdjust: (productId: string, newStock: number, reason: AdjustmentReason, notes?: string) => void;
  canManage: boolean;
  isSelected: boolean;
  onSelectChange: (selected: boolean) => void;
  showSelection: boolean;
}

function ProductCard({ 
  product, 
  index, 
  onClick, 
  onQuickAdjust, 
  canManage,
  isSelected,
  onSelectChange,
  showSelection,
}: ProductCardProps) {
  const status = statusConfig[product.status];
  
  return (
    <motion.div
      className={`stat-card flex flex-col cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all ${
        isSelected ? "ring-2 ring-primary" : ""
      }`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {showSelection && canManage && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelectChange(!!checked)}
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
            <Package className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`status-badge ${status.class}`}>
            {status.label}
          </span>
          {canManage && (
            <QuickStockAdjustment
              product={product}
              onAdjust={onQuickAdjust}
            />
          )}
        </div>
      </div>
      
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">{product.brand} • {product.line}</p>
        <h3 className="font-medium text-foreground mt-1">{product.shade || product.name}</h3>
        <p className="text-sm text-muted-foreground">{product.shade ? product.name : ""}</p>
      </div>
      
      <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
        <div>
          <p className="text-2xl font-semibold text-foreground">{product.stock}</p>
          <p className="text-xs text-muted-foreground">units in stock</p>
        </div>
        {product.stock <= product.reorderLevel && product.stock > 0 && (
          <AlertTriangle className="w-5 h-5 text-warning" />
        )}
      </div>
    </motion.div>
  );
}

interface ProductRowProps {
  product: Product;
  index: number;
  onClick: () => void;
  onQuickAdjust: (productId: string, newStock: number, reason: AdjustmentReason, notes?: string) => void;
  canManage: boolean;
  isSelected: boolean;
  onSelectChange: (selected: boolean) => void;
  showSelection: boolean;
}

function ProductRow({ 
  product, 
  index, 
  onClick, 
  onQuickAdjust, 
  canManage,
  isSelected,
  onSelectChange,
  showSelection,
}: ProductRowProps) {
  const status = statusConfig[product.status];
  
  return (
    <motion.tr
      className={`border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer ${
        isSelected ? "bg-primary/5" : ""
      }`}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      onClick={onClick}
    >
      {showSelection && canManage && (
        <td className="py-4 px-4 w-12">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelectChange(!!checked)}
            onClick={(e) => e.stopPropagation()}
          />
        </td>
      )}
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
            <Package className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">{product.shade || product.name}</p>
            <p className="text-xs text-muted-foreground">{product.shade ? product.name : ""}</p>
          </div>
        </div>
      </td>
      <td className="py-4 px-4 text-sm text-muted-foreground">{product.brand}</td>
      <td className="py-4 px-4 text-sm text-muted-foreground">{product.line}</td>
      <td className="py-4 px-4">
        <span className="font-medium text-foreground">{product.stock}</span>
      </td>
      <td className="py-4 px-4">
        <span className={`status-badge ${status.class}`}>
          {status.label}
        </span>
      </td>
      <td className="py-4 px-4">
        {canManage && (
          <QuickStockAdjustment
            product={product}
            onAdjust={onQuickAdjust}
          />
        )}
      </td>
    </motion.tr>
  );
}

export default function Inventory() {
  const isMobile = useIsMobile();
  const [view, setView] = useState<"grid" | "list" | "grouped">("grouped");
  
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isReorderSheetOpen, setIsReorderSheetOpen] = useState(false);
  const [isHistorySheetOpen, setIsHistorySheetOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [showImportCard, setShowImportCard] = useState(false);
  const [showCatalogBrowser, setShowCatalogBrowser] = useState(false);
  const [showBulkEditDialog, setShowBulkEditDialog] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isReceiptScannerOpen, setIsReceiptScannerOpen] = useState(false);
  const [isStockLogOpen, setIsStockLogOpen] = useState(false);
  
  // Hierarchical filter state
  const [inventoryFilters, setInventoryFilters] = useState<InventoryFilters>(defaultInventoryFilters);
  
  // Active/Inactive view state
  const [showInactive, setShowInactive] = useState(false);
  
  // Status & Sort state (secondary filters)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("tone");
  const groupBy = (sortBy === "tone" || sortBy === "level" || sortBy === "stock") ? sortBy : "tone";
  
  // Batch selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { products, isLoading, createProduct, updateProduct, deleteProduct, deleteManyProducts, updateManyProducts } = useProducts();
  const { createAdjustment } = useStockAdjustments();
  const { effectiveStaff, isLoading: staffLoading } = useEffectiveStaff();
  
  const canManageProducts = effectiveStaff?.permissions.can_manage_products ?? false;
  const canViewCosts = effectiveStaff?.permissions.can_view_product_costs ?? false;
  const isOwner = effectiveStaff?.role === "owner";
  const canAdjustStock = canManageProducts || effectiveStaff?.role === "manager" || isOwner;

  // Split products into active and inactive
  const activeProducts = useMemo(() => products.filter(p => p.isActive), [products]);
  const inactiveProducts = useMemo(() => products.filter(p => !p.isActive), [products]);
  
  // The base products for the current view
  const viewProducts = showInactive ? inactiveProducts : activeProducts;

  // Apply hierarchical filters, then status/search/sort
  const filteredProducts = useMemo(() => {
    // First apply hierarchical filters
    let result = applyInventoryFilters(viewProducts, inventoryFilters);
    
    // Then apply status filter
    result = result.filter(p => {
      if (statusFilter === "all") return true;
      return p.status === statusFilter;
    });
    
    // Then apply search
    result = result.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.shade && p.shade.toLowerCase().includes(search.toLowerCase())) ||
      p.brand.toLowerCase().includes(search.toLowerCase())
    );
    
    // Finally sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "stock":
          return a.stock - b.stock;
        default:
          return (a.shade || a.name).localeCompare(b.shade || b.name);
      }
    });
    
    return result;
  }, [viewProducts, inventoryFilters, statusFilter, search, sortBy]);

  const lowStockCount = activeProducts.filter(p => p.status === "low" || p.status === "out").length;
  const selectedProducts = products.filter(p => selectedIds.has(p.id));
  const showSelection = selectedIds.size > 0;
  
  const hasActiveHierarchicalFilters = 
    inventoryFilters.brand || 
    inventoryFilters.line || 
    inventoryFilters.type || 
    inventoryFilters.level !== null ||
    inventoryFilters.tone;

  // Context label for the value card header
  const contextLabel = useMemo(() => {
    if (showInactive) return null;
    if (inventoryFilters.line) return `${inventoryFilters.brand} ${inventoryFilters.line}`;
    if (inventoryFilters.brand) return inventoryFilters.brand;
    if (inventoryFilters.type) return inventoryFilters.type;
    return null;
  }, [inventoryFilters, showInactive]);

  // Derive existing brands and lines for ProductDialog
  const existingBrands = useMemo(() => getUniqueValues(products, "brand"), [products]);
  const existingLines = useMemo(() => {
    const map: Record<string, string[]> = {};
    products.forEach(p => {
      if (p.brand && p.line) {
        if (!map[p.brand]) map[p.brand] = [];
        if (!map[p.brand].includes(p.line)) map[p.brand].push(p.line);
      }
    });
    return map;
  }, [products]);

  // Products to pass to the value card
  const valueCardProducts = useMemo(() => {
    if (showInactive) return inactiveProducts;
    if (hasActiveHierarchicalFilters) return filteredProducts;
    return activeProducts;
  }, [showInactive, inactiveProducts, hasActiveHierarchicalFilters, filteredProducts, activeProducts]);

  const handleProductAdded = (formData: ProductFormData) => {
    createProduct.mutate(formData);
  };

  const handleProductUpdated = (id: string, formData: ProductFormData) => {
    updateProduct.mutate({ id, formData });
  };

  const handleProductDeleted = (id: string) => {
    deleteProduct.mutate(id);
  };

  const handleOpenAddDialog = () => {
    setEditingProduct(null);
    setIsDialogOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingProduct(null);
    }
  };

  const handleQuickAdjust = async (
    productId: string, 
    newStock: number, 
    reason: AdjustmentReason, 
    notes?: string
  ) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    createAdjustment.mutate({
      productId,
      previousStock: product.stock,
      newStock,
      reason,
      notes,
    });
  };

  const handleViewHistory = (product: Product) => {
    setHistoryProduct(product);
    setIsHistorySheetOpen(true);
  };

  // Batch operations
  const handleSelectProduct = (productId: string, selected: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (selected) {
        next.add(productId);
      } else {
        next.delete(productId);
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map(p => p.id)));
    }
  };

  const handleSelectFiltered = () => {
    const filteredIds = new Set(filteredProducts.map(p => p.id));
    const allFilteredSelected = filteredProducts.every(p => selectedIds.has(p.id));
    
    if (allFilteredSelected) {
      // Deselect all filtered
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredProducts.forEach(p => next.delete(p.id));
        return next;
      });
    } else {
      // Select all filtered
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredProducts.forEach(p => next.add(p.id));
        return next;
      });
    }
  };

  const handleDeleteSelected = async () => {
    await deleteManyProducts.mutateAsync(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleSetInactive = async () => {
    const activeIds = selectedProducts.filter(p => p.isActive).map(p => p.id);
    await updateManyProducts.mutateAsync({
      ids: activeIds,
      updates: { is_active: false },
    });
    setSelectedIds(new Set());
  };

  const handleBulkUpdate = async (field: "stock" | "reorderLevel" | "targetStock" | "cost", value: number) => {
    const ids = Array.from(selectedIds);
    
    if (field === "cost") {
      // User enters a tube/bottle price — convert to cost_per_unit for each product
      // since products may have different sizes, we need per-product updates
      const updates = selectedProducts.map(p => ({
        id: p.id,
        cost_per_unit: p.size > 0 ? value / p.size : 0,
      }));
      
      // Update each product individually with its calculated cost_per_unit
      for (const update of updates) {
        await updateManyProducts.mutateAsync({
          ids: [update.id],
          updates: { cost_per_unit: update.cost_per_unit },
        });
      }
    } else {
      const fieldMap: Record<string, string> = {
        stock: "stock",
        reorderLevel: "reorder_level",
        targetStock: "target_stock",
      };
      
      await updateManyProducts.mutateAsync({
        ids,
        updates: { [fieldMap[field]]: value },
      });
    }
    setSelectedIds(new Set());
  };

  const handleExportSelected = () => {
    const csvContent = [
      ["Brand", "Line", "Name", "Shade", "Stock", "Reorder Level", "Status"].join(","),
      ...selectedProducts.map(p => 
        [p.brand, p.line, p.name, p.shade, p.stock, p.reorderLevel, p.status].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `selected-products-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Export complete",
      description: `${selectedProducts.length} products exported to CSV.`,
    });
  };

  if (isLoading || staffLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const handleShowInactive = (inactive: boolean) => {
    setShowInactive(inactive);
    if (inactive) {
      setInventoryFilters(defaultInventoryFilters);
      setStatusFilter("all");
    }
  };

  const SidebarContent = (
    <ToneNavigator
      products={activeProducts}
      filters={inventoryFilters}
      onFiltersChange={(filters) => {
        setShowInactive(false);
        setInventoryFilters(filters);
      }}
      onClose={isMobile ? () => setSidebarOpen(false) : undefined}
      className="w-full"
      inactiveCount={inactiveProducts.length}
      showInactive={showInactive}
      onShowInactive={handleShowInactive}
    />
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="flex">
        {/* Desktop sidebar */}
        {!isMobile && products.length > 0 && (
          <aside className="w-60 shrink-0 border-r border-border bg-card hidden md:block sticky top-0 h-screen overflow-y-auto">
            {SidebarContent}
          </aside>
        )}

        <div className="flex-1 min-w-0">
          <PageLayout
            title="Inventory"
            subtitle={`${filteredProducts.length} of ${products.length} products${lowStockCount > 0 ? ` • ${lowStockCount} need attention` : ""}`}
            action={
              <div className="flex gap-2">
                {canManageProducts && (
                  <Button 
                    variant="outline" 
                    className="gap-2" 
                    onClick={() => setIsReceiptScannerOpen(true)}
                  >
                    <Camera className="w-4 h-4" />
                    <span className="hidden sm:inline">Scan Receipt</span>
                  </Button>
                )}
                {canAdjustStock && (
                  <Button 
                    variant="outline" 
                    className="gap-2" 
                    onClick={() => setIsStockLogOpen(true)}
                  >
                    <History className="w-4 h-4" />
                    <span className="hidden sm:inline">Stock Log</span>
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  className="gap-2" 
                  onClick={() => setIsReorderSheetOpen(true)}
                >
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">Reorder Report</span>
                  {lowStockCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-destructive text-destructive-foreground">
                      {lowStockCount}
                    </span>
                  )}
                </Button>
                {canManageProducts && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="gap-2">
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Add Product</span>
                        <ChevronDown className="w-4 h-4 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={handleOpenAddDialog}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Manually
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowImportCard(true)}>
                        <Upload className="w-4 h-4 mr-2" />
                        Import from CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowCatalogBrowser(true)}>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Browse Product Lines
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            }
          >
            {/* Owner-only inventory value card */}
            {isOwner && products.length > 0 && (
              <InventoryValueCard 
                products={valueCardProducts} 
                isInactiveView={showInactive}
                contextLabel={contextLabel}
              />
            )}

            {/* Breadcrumb for active filters */}
            {hasActiveHierarchicalFilters && (
              <InventoryBreadcrumb
                filters={inventoryFilters}
                onFiltersChange={setInventoryFilters}
                className="mb-4"
              />
            )}

            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              {/* Mobile filter button */}
              {isMobile && products.length > 0 && (
                <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="shrink-0">
                      <SlidersHorizontal className="w-4 h-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-72 p-0">
                    {SidebarContent}
                  </SheetContent>
                </Sheet>
              )}

              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search products..." 
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2">
                <InventoryFiltersDropdown
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  sortBy={sortBy}
                  onSortByChange={setSortBy}
                />
                
                <Tabs value={view} onValueChange={(v) => setView(v as "grid" | "list" | "grouped")}>
                  <TabsList className="bg-secondary">
                    <TabsTrigger value="grouped" className="gap-2">
                      <Sparkles className="w-4 h-4" />
                      <span className="hidden sm:inline">Grouped</span>
                    </TabsTrigger>
                    <TabsTrigger value="grid" className="gap-2">
                      <LayoutGrid className="w-4 h-4" />
                      <span className="hidden sm:inline">Grid</span>
                    </TabsTrigger>
                    <TabsTrigger value="list" className="gap-2">
                      <List className="w-4 h-4" />
                      <span className="hidden sm:inline">List</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            {showImportCard && canManageProducts ? (
              <div className="max-w-2xl mx-auto">
                <ProductImportCard onBack={() => setShowImportCard(false)} />
              </div>
            ) : products.length === 0 ? (
              canManageProducts ? (
                <InventorySetupOptions onAddManually={handleOpenAddDialog} />
              ) : (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No products in inventory</h3>
                  <p className="text-muted-foreground">Contact your salon owner to add products.</p>
                </div>
              )
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium text-foreground mb-2">No products found</h3>
                <p className="text-muted-foreground mb-4">Try a different search term or filter</p>
                {(statusFilter !== "all" || hasActiveHierarchicalFilters || search) && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setStatusFilter("all");
                      setSearch("");
                      setInventoryFilters({
                        brand: null,
                        line: null,
                        type: null,
                        level: null,
                        tone: null,
                      });
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Selection Toolbar */}
                {canManageProducts && products.length > 0 && (
                  <SelectionToolbar
                    products={products}
                    filteredProducts={filteredProducts}
                    selectedIds={selectedIds}
                    onSelectAll={handleSelectAll}
                    onSelectFiltered={handleSelectFiltered}
                    onClearSelection={handleClearSelection}
                    canManage={canManageProducts}
                  />
                )}

                <AnimatePresence mode="wait">
                  {view === "grouped" ? (
                    <motion.div
                      key="grouped"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <GroupedProductGrid
                        products={filteredProducts}
                        selectedIds={selectedIds}
                        onSelectProduct={handleSelectProduct}
                        onEditProduct={handleEditProduct}
                        onQuickAdjust={handleQuickAdjust}
                        canManage={canAdjustStock}
                        showSelection={showSelection}
                        groupBy={groupBy}
                      />
                    </motion.div>
                  ) : view === "grid" ? (
                    <motion.div
                      key="grid"
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {filteredProducts.map((product, index) => (
                        <ProductCard 
                          key={product.id} 
                          product={product} 
                          index={index} 
                          onClick={() => handleEditProduct(product)}
                          onQuickAdjust={handleQuickAdjust}
                          canManage={canAdjustStock}
                          isSelected={selectedIds.has(product.id)}
                          onSelectChange={(selected) => handleSelectProduct(product.id, selected)}
                          showSelection={showSelection}
                        />
                      ))}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="list"
                      className="stat-card overflow-hidden p-0"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <table className="w-full">
                        <thead className="bg-muted/30">
                          <tr className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {showSelection && canManageProducts && <th className="py-3 px-4 w-12"></th>}
                            <th className="py-3 px-4">Product</th>
                            <th className="py-3 px-4">Brand</th>
                            <th className="py-3 px-4">Line</th>
                            <th className="py-3 px-4">Stock</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4 w-12"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredProducts.map((product, index) => (
                            <ProductRow 
                              key={product.id} 
                              product={product} 
                              index={index}
                              onClick={() => handleEditProduct(product)}
                              onQuickAdjust={handleQuickAdjust}
                              canManage={canAdjustStock}
                              isSelected={selectedIds.has(product.id)}
                              onSelectChange={(selected) => handleSelectProduct(product.id, selected)}
                              showSelection={showSelection}
                            />
                          ))}
                        </tbody>
                      </table>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </PageLayout>
        </div>
      </div>

      <ProductDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        onProductAdded={handleProductAdded}
        onProductUpdated={handleProductUpdated}
        onProductDeleted={handleProductDeleted}
        editingProduct={editingProduct}
        canViewCosts={canViewCosts}
        readOnly={!canManageProducts}
        onViewHistory={handleViewHistory}
        existingBrands={existingBrands}
        existingLines={existingLines}
      />

      <ReorderReportSheet
        open={isReorderSheetOpen}
        onOpenChange={setIsReorderSheetOpen}
        products={valueCardProducts}
        isOwner={isOwner}
        contextLabel={contextLabel}
      />

      <StockHistorySheet
        open={isHistorySheetOpen}
        onOpenChange={setIsHistorySheetOpen}
        product={historyProduct}
      />

      <StockAdjustmentsReport
        open={isStockLogOpen}
        onOpenChange={setIsStockLogOpen}
      />

      <ProductCatalogBrowser
        open={showCatalogBrowser}
        onOpenChange={setShowCatalogBrowser}
      />

      {/* Bulk Edit Dialog */}
      <BulkEditDialog
        open={showBulkEditDialog}
        onOpenChange={setShowBulkEditDialog}
        selectedProducts={selectedProducts}
        onBulkUpdate={handleBulkUpdate}
        isUpdating={updateManyProducts.isPending}
        canViewCosts={canViewCosts}
      />

      {/* Batch Actions Bar */}
      <AnimatePresence>
        {showSelection && canManageProducts && (
          <BatchActionsBar
            selectedProducts={selectedProducts}
            onClearSelection={handleClearSelection}
            onDeleteSelected={handleDeleteSelected}
            onSetInactive={handleSetInactive}
            onExportSelected={handleExportSelected}
            onBulkEdit={() => setShowBulkEditDialog(true)}
            isDeleting={deleteManyProducts.isPending}
            isUpdating={updateManyProducts.isPending}
          />
        )}
      </AnimatePresence>

      {/* Receipt Scanner */}
      <ReceiptScanner
        open={isReceiptScannerOpen}
        onOpenChange={setIsReceiptScannerOpen}
      />
    </div>
  );
}
