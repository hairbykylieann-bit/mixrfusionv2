import { useState } from "react";
import { ChevronDown, ChevronUp, DollarSign, TrendingUp, Package } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Product } from "@/hooks/useProducts";

interface InventoryValueCardProps {
  products: Product[];
  isInactiveView?: boolean;
  contextLabel?: string | null;
}

interface BrandValue {
  brand: string;
  value: number;
  count: number;
}

export function InventoryValueCard({ products, isInactiveView = false, contextLabel }: InventoryValueCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  // For inactive view, show $0 (no active stock); otherwise calc normally
  const totalValue = isInactiveView
    ? 0
    : products.reduce((sum, p) => sum + (p.stock * p.cost), 0);

  // Calculate value by brand (only for active view)
  const valueByBrand = products.reduce((acc, p) => {
    const value = isInactiveView ? 0 : p.stock * p.cost;
    if (!acc[p.brand]) {
      acc[p.brand] = { brand: p.brand, value: 0, count: 0 };
    }
    acc[p.brand].value += value;
    acc[p.brand].count += 1;
    return acc;
  }, {} as Record<string, BrandValue>);

  const brandValues = Object.values(valueByBrand)
    .sort((a, b) => b.value - a.value);
  
  // Top 5 most valuable products (for inactive: show by restock cost)
  const topProducts = [...products]
    .map(p => ({ 
      ...p, 
      totalValue: isInactiveView ? (p.targetStock * p.cost) : (p.stock * p.cost) 
    }))
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 5);

  // For inactive view: full restock cost = targetStock * cost for every product
  // For active view: cost to bring below-reorder products up to target
  const reorderValue = isInactiveView
    ? products.reduce((sum, p) => sum + (p.targetStock * p.cost), 0)
    : products
        .filter(p => p.stock <= p.reorderLevel)
        .reduce((sum, p) => {
          const unitsNeeded = Math.max(0, Math.ceil(p.targetStock - p.stock)); // whole containers
          return sum + (unitsNeeded * p.cost);
        }, 0);

  // Derive display labels
  const valueLabel = isInactiveView
    ? "Inactive Products Value"
    : contextLabel
    ? `${contextLabel} Value`
    : "Total Inventory Value";

  const reorderLabel = isInactiveView ? "Full Restock Cost" : "Reorder Value";

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const maxBrandValue = brandValues[0]?.value || 1;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <motion.div 
        className="stat-card mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full flex items-center justify-between p-0 h-auto hover:bg-transparent"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-sm text-muted-foreground">{valueLabel}</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(totalValue)}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {reorderValue > 0 && (
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-muted-foreground">{reorderLabel}</p>
                  <p className="text-sm font-medium text-warning">{formatCurrency(reorderValue)}</p>
                </div>
              )}
              {isOpen ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 pt-6 border-t border-border"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Value by Brand */}
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      Value by Brand
                    </h4>
                    <div className="space-y-3">
                      {brandValues.slice(0, 5).map((brand) => (
                        <div key={brand.brand} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-foreground">{brand.brand}</span>
                            <span className="text-muted-foreground">
                              {formatCurrency(brand.value)}
                            </span>
                          </div>
                          <Progress 
                            value={(brand.value / maxBrandValue) * 100} 
                            className="h-2"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Products */}
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
                      <Package className="w-4 h-4 text-muted-foreground" />
                      Top Products by Value
                    </h4>
                    <div className="space-y-2">
                      {topProducts.map((product, idx) => (
                        <div 
                          key={product.id} 
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-medium text-muted-foreground w-4">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {product.shade || product.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {product.brand} • {parseFloat(Number(product.stock).toFixed(2))} units
                              </p>
                            </div>
                          </div>
                          <span className="text-sm font-medium text-foreground">
                            {formatCurrency(product.totalValue)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CollapsibleContent>
      </motion.div>
    </Collapsible>
  );
}
