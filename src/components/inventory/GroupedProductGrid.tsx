import { motion } from "framer-motion";
import { Package, AlertTriangle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { QuickStockAdjustment, AdjustmentReason } from "@/components/inventory/QuickStockAdjustment";
import { 
  groupProductsByTone, 
  groupProductsByLevel,
  groupProductsByStatus,
  groupNonColorProducts,
  extractLevel,
  ToneGroup,
  TypeGroup,
  LevelGroup,
  StatusGroup,
} from "@/lib/inventoryUtils";
import type { Product } from "@/hooks/useProducts";
import { cn } from "@/lib/utils";

const statusConfig = {
  "in-stock": { label: "In Stock", class: "status-in-stock" },
  "low": { label: "Low Stock", class: "status-low" },
  "out": { label: "Out of Stock", class: "status-out" },
};

interface GroupedProductGridProps {
  products: Product[];
  selectedIds: Set<string>;
  onSelectProduct: (productId: string, selected: boolean) => void;
  onEditProduct: (product: Product) => void;
  onQuickAdjust: (productId: string, newStock: number, reason: AdjustmentReason, notes?: string) => void;
  canManage: boolean;
  showSelection: boolean;
  groupBy?: "tone" | "level" | "stock";
}

interface CompactProductCardProps {
  product: Product;
  isSelected: boolean;
  onSelectChange: (selected: boolean) => void;
  onClick: () => void;
  onQuickAdjust: (productId: string, newStock: number, reason: AdjustmentReason, notes?: string) => void;
  canManage: boolean;
  showSelection: boolean;
}

function CompactProductCard({
  product,
  isSelected,
  onSelectChange,
  onClick,
  onQuickAdjust,
  canManage,
  showSelection,
}: CompactProductCardProps) {
  const status = statusConfig[product.status];
  const level = extractLevel(product.shade);
  const isLowOrOut = product.stock <= product.reorderLevel;

  return (
    <motion.div
      className={cn(
        "relative bg-card border border-border rounded-lg p-3 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all",
        isSelected && "ring-2 ring-primary",
        product.status === "out" && "opacity-70"
      )}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Selection checkbox */}
      {showSelection && canManage && (
        <div className="absolute top-2 left-2">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelectChange(!!checked)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Status indicator */}
      <div className="absolute top-2 right-2">
        {isLowOrOut && product.stock > 0 && (
          <AlertTriangle className="w-4 h-4 text-warning" />
        )}
        {product.status === "out" && (
          <span className="text-xs text-destructive font-medium">OUT</span>
        )}
      </div>

      {/* Main content */}
      <div className={cn("text-center", showSelection && canManage && "mt-4")}>
        {/* Brand at top - who makes it */}
        <p className="text-[10px] font-medium text-muted-foreground truncate">
          {product.brand}
        </p>
        
        {/* Shade code - the most important info */}
        <p className="text-lg font-bold text-foreground">
          {product.shade || product.name}
        </p>
        
        {/* Stock count */}
        <div className="mt-1 flex items-center justify-center gap-1">
          <span className={cn(
            "text-xl font-semibold tabular-nums",
            product.status === "out" && "text-destructive",
            product.status === "low" && "text-warning",
            product.status === "in-stock" && "text-success"
          )}>
            {product.stock}
          </span>
        </div>
        
        {/* Line at bottom - which formula */}
        {product.line && (
          <p className="text-[9px] text-muted-foreground/70 truncate mt-1">
            {product.line}
          </p>
        )}
      </div>

      {/* Quick adjust button */}
      {canManage && (
        <div className="mt-2 flex justify-center" onClick={(e) => e.stopPropagation()}>
          <QuickStockAdjustment
            product={product}
            onAdjust={onQuickAdjust}
          />
        </div>
      )}
    </motion.div>
  );
}

interface ToneSectionProps {
  group: ToneGroup;
  selectedIds: Set<string>;
  onSelectProduct: (productId: string, selected: boolean) => void;
  onEditProduct: (product: Product) => void;
  onQuickAdjust: (productId: string, newStock: number, reason: AdjustmentReason, notes?: string) => void;
  canManage: boolean;
  showSelection: boolean;
}

function ToneSection({
  group,
  selectedIds,
  onSelectProduct,
  onEditProduct,
  onQuickAdjust,
  canManage,
  showSelection,
}: ToneSectionProps) {
  const lowStockCount = group.products.filter(p => p.status === "low" || p.status === "out").length;

  return (
    <motion.section
      className="mb-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Section header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
            {group.name}
          </h3>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {group.tone}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{group.products.length} shades</span>
          {lowStockCount > 0 && (
            <span className="text-warning flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {lowStockCount} need attention
            </span>
          )}
        </div>
      </div>

      {/* Products grid - sorted by level */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
        {group.products.map((product) => (
          <CompactProductCard
            key={product.id}
            product={product}
            isSelected={selectedIds.has(product.id)}
            onSelectChange={(selected) => onSelectProduct(product.id, selected)}
            onClick={() => onEditProduct(product)}
            onQuickAdjust={onQuickAdjust}
            canManage={canManage}
            showSelection={showSelection}
          />
        ))}
      </div>
    </motion.section>
  );
}

interface TypeSectionProps {
  group: TypeGroup;
  selectedIds: Set<string>;
  onSelectProduct: (productId: string, selected: boolean) => void;
  onEditProduct: (product: Product) => void;
  onQuickAdjust: (productId: string, newStock: number, reason: AdjustmentReason, notes?: string) => void;
  canManage: boolean;
  showSelection: boolean;
}

function TypeSection({
  group,
  selectedIds,
  onSelectProduct,
  onEditProduct,
  onQuickAdjust,
  canManage,
  showSelection,
}: TypeSectionProps) {
  return (
    <motion.section
      className="mb-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Section header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
          {group.type}s
        </h3>
        <span className="text-xs text-muted-foreground">
          {group.products.length} products
        </span>
      </div>

      {/* Products grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {group.products.map((product) => (
          <motion.div
            key={product.id}
            className={cn(
              "relative bg-card border border-border rounded-lg p-3 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all",
              selectedIds.has(product.id) && "ring-2 ring-primary"
            )}
            onClick={() => onEditProduct(product)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {showSelection && canManage && (
              <div className="absolute top-2 left-2">
                <Checkbox
                  checked={selectedIds.has(product.id)}
                  onCheckedChange={(checked) => onSelectProduct(product.id, !!checked)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}

            <div className={cn("text-center", showSelection && canManage && "mt-4")}>
              <p className="text-sm font-medium text-foreground truncate">
                {product.name}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {product.size} {product.sizeUnit}
              </p>
              <div className="mt-2 flex items-center justify-center gap-1">
                <span className={cn(
                  "text-xl font-semibold tabular-nums",
                  product.status === "out" && "text-destructive",
                  product.status === "low" && "text-warning",
                  product.status === "in-stock" && "text-success"
                )}>
                  {product.stock}
                </span>
              </div>
            </div>

            {canManage && (
              <div className="mt-2 flex justify-center" onClick={(e) => e.stopPropagation()}>
                <QuickStockAdjustment
                  product={product}
                  onAdjust={onQuickAdjust}
                />
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}

interface LevelSectionProps {
  group: LevelGroup;
  selectedIds: Set<string>;
  onSelectProduct: (productId: string, selected: boolean) => void;
  onEditProduct: (product: Product) => void;
  onQuickAdjust: (productId: string, newStock: number, reason: AdjustmentReason, notes?: string) => void;
  canManage: boolean;
  showSelection: boolean;
}

function LevelSection({
  group,
  selectedIds,
  onSelectProduct,
  onEditProduct,
  onQuickAdjust,
  canManage,
  showSelection,
}: LevelSectionProps) {
  const lowStockCount = group.products.filter(p => p.status === "low" || p.status === "out").length;

  return (
    <motion.section
      className="mb-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
          {group.name}
        </h3>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{group.products.length} shades</span>
          {lowStockCount > 0 && (
            <span className="text-warning flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {lowStockCount} need attention
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
        {group.products.map((product) => (
          <CompactProductCard
            key={product.id}
            product={product}
            isSelected={selectedIds.has(product.id)}
            onSelectChange={(selected) => onSelectProduct(product.id, selected)}
            onClick={() => onEditProduct(product)}
            onQuickAdjust={onQuickAdjust}
            canManage={canManage}
            showSelection={showSelection}
          />
        ))}
      </div>
    </motion.section>
  );
}

interface StatusSectionProps {
  group: StatusGroup;
  selectedIds: Set<string>;
  onSelectProduct: (productId: string, selected: boolean) => void;
  onEditProduct: (product: Product) => void;
  onQuickAdjust: (productId: string, newStock: number, reason: AdjustmentReason, notes?: string) => void;
  canManage: boolean;
  showSelection: boolean;
}

function StatusSection({
  group,
  selectedIds,
  onSelectProduct,
  onEditProduct,
  onQuickAdjust,
  canManage,
  showSelection,
}: StatusSectionProps) {
  const statusColors: Record<string, string> = {
    "in-stock": "text-success",
    "low": "text-warning",
    "out": "text-destructive",
  };

  return (
    <motion.section
      className="mb-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
        <h3 className={cn("text-sm font-semibold uppercase tracking-wide", statusColors[group.status] || "text-foreground")}>
          {group.label}
        </h3>
        <span className="text-xs text-muted-foreground">
          {group.products.length} products
        </span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
        {group.products.map((product) => (
          <CompactProductCard
            key={product.id}
            product={product}
            isSelected={selectedIds.has(product.id)}
            onSelectChange={(selected) => onSelectProduct(product.id, selected)}
            onClick={() => onEditProduct(product)}
            onQuickAdjust={onQuickAdjust}
            canManage={canManage}
            showSelection={showSelection}
          />
        ))}
      </div>
    </motion.section>
  );
}

export function GroupedProductGrid({
  products,
  selectedIds,
  onSelectProduct,
  onEditProduct,
  onQuickAdjust,
  canManage,
  showSelection,
  groupBy = "tone",
}: GroupedProductGridProps) {
  // Stock grouping handles ALL products together
  if (groupBy === "stock") {
    const statusGroups = groupProductsByStatus(products);

    if (statusGroups.length === 0) {
      return (
        <div className="text-center py-12">
          <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium text-foreground mb-2">No products to display</h3>
          <p className="text-muted-foreground">Try adjusting your filters</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {statusGroups.map((group) => (
          <StatusSection
            key={group.status}
            group={group}
            selectedIds={selectedIds}
            onSelectProduct={onSelectProduct}
            onEditProduct={onEditProduct}
            onQuickAdjust={onQuickAdjust}
            canManage={canManage}
            showSelection={showSelection}
          />
        ))}
      </div>
    );
  }

  const toneGroups = groupBy === "tone" ? groupProductsByTone(products) : [];
  const levelGroups = groupBy === "level" ? groupProductsByLevel(products) : [];
  const typeGroups = groupNonColorProducts(products);

  const hasColorGroups = groupBy === "tone" ? toneGroups.length > 0 : levelGroups.length > 0;

  if (!hasColorGroups && typeGroups.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
        <h3 className="text-lg font-medium text-foreground mb-2">No products to display</h3>
        <p className="text-muted-foreground">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {groupBy === "tone" && toneGroups.map((group) => (
        <ToneSection
          key={group.tone}
          group={group}
          selectedIds={selectedIds}
          onSelectProduct={onSelectProduct}
          onEditProduct={onEditProduct}
          onQuickAdjust={onQuickAdjust}
          canManage={canManage}
          showSelection={showSelection}
        />
      ))}

      {groupBy === "level" && levelGroups.map((group) => (
        <LevelSection
          key={group.level}
          group={group}
          selectedIds={selectedIds}
          onSelectProduct={onSelectProduct}
          onEditProduct={onEditProduct}
          onQuickAdjust={onQuickAdjust}
          canManage={canManage}
          showSelection={showSelection}
        />
      ))}

      {typeGroups.map((group) => (
        <TypeSection
          key={group.type}
          group={group}
          selectedIds={selectedIds}
          onSelectProduct={onSelectProduct}
          onEditProduct={onEditProduct}
          onQuickAdjust={onQuickAdjust}
          canManage={canManage}
          showSelection={showSelection}
        />
      ))}
    </div>
  );
}