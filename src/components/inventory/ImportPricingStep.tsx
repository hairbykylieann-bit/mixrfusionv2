import { useState, useMemo, useEffect } from "react";
import { ArrowLeft, Import, Loader2, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { CatalogProduct, ProductCatalog } from "@/hooks/useProductCatalogs";

interface CatalogTypePricingGroup {
  key: string; // catalog_id:type
  catalog: ProductCatalog;
  type: string;
  products: CatalogProduct[];
  suggestedCost: number;
  size: number;
  sizeUnit: string;
}

function getContainerLabel(size: number, sizeUnit: string): string {
  const unit = sizeUnit.toLowerCase();
  if (size >= 200) {
    return unit === "g" || unit === "oz" ? "per tub" : "per bottle";
  }
  return "per tube";
}

interface ImportPricingStepProps {
  selectedProducts: CatalogProduct[];
  catalogs: ProductCatalog[];
  onBack: () => void;
  onImport: (pricing: Record<string, number>) => void;
  isImporting: boolean;
}

export function ImportPricingStep({
  selectedProducts,
  catalogs,
  onBack,
  onImport,
  isImporting,
}: ImportPricingStepProps) {
  // Group products by catalog + type
  const pricingGroups = useMemo(() => {
    const groups: Record<string, CatalogTypePricingGroup> = {};

    selectedProducts.forEach((product) => {
      if (!product.catalog_id) return;

      const type = product.type || "Color";
      const key = `${product.catalog_id}:${type}`;

      if (!groups[key]) {
        const catalog = catalogs.find((c) => c.id === product.catalog_id);
        if (!catalog) return;

        groups[key] = {
          key,
          catalog,
          type,
          products: [],
          suggestedCost: 0,
          size: product.default_size || 60,
          sizeUnit: product.default_size_unit || "ml",
        };
      }

      groups[key].products.push(product);

      // Use suggested_cost_per_unit directly - it's already the total tube cost
      if (
        product.suggested_cost_per_unit &&
        product.suggested_cost_per_unit > 0 &&
        groups[key].suggestedCost === 0
      ) {
        groups[key].suggestedCost = product.suggested_cost_per_unit;
      }
    });

    // Sort: by catalog brand+line, then by type order
    const typeOrder = ["Color", "Toner", "Additive", "Developer", "Lightener", "Treatment"];
    return Object.values(groups).sort((a, b) => {
      const catCmp = `${a.catalog.brand} ${a.catalog.line}`.localeCompare(
        `${b.catalog.brand} ${b.catalog.line}`
      );
      if (catCmp !== 0) return catCmp;
      const aIdx = typeOrder.indexOf(a.type);
      const bIdx = typeOrder.indexOf(b.type);
      return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
    });
  }, [selectedProducts, catalogs]);

  // State for user-entered pricing (key -> cost string)
  const [pricing, setPricing] = useState<Record<string, string>>({});

  useEffect(() => {
    setPricing((prev) => {
      const updated: Record<string, string> = {};
      pricingGroups.forEach((group) => {
        if (prev[group.key] !== undefined) {
          updated[group.key] = prev[group.key];
        } else if (group.suggestedCost > 0) {
          updated[group.key] = group.suggestedCost.toFixed(2);
        } else {
          updated[group.key] = "";
        }
      });
      return updated;
    });
  }, [pricingGroups]);

  const handlePricingChange = (key: string, value: string) => {
    if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
      setPricing((prev) => ({ ...prev, [key]: value }));
    }
  };

  const allPricingEntered = pricingGroups.every((group) => {
    const value = pricing[group.key];
    return value && parseFloat(value) > 0;
  });

  const handleImport = () => {
    const pricingMap: Record<string, number> = {};
    pricingGroups.forEach((group) => {
      pricingMap[group.key] = parseFloat(pricing[group.key]) || 0;
    });
    onImport(pricingMap);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="space-y-2 mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          Set Your Pricing
        </h3>
        <p className="text-sm text-muted-foreground">
          Enter your actual cost for each product type. This ensures accurate inventory
          values and cost calculations.
        </p>
      </div>

      {/* Pricing Groups */}
      <ScrollArea className="flex-1 -mx-6 px-6">
        <div className="space-y-4 pb-4">
          {pricingGroups.map((group) => {
            const containerLabel = getContainerLabel(group.size, group.sizeUnit);
            return (
              <div
                key={group.key}
                className="p-4 rounded-lg border border-border bg-secondary/30"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h4 className="font-medium text-foreground">
                      {group.catalog.brand} {group.catalog.line}{" "}
                      <span className="text-muted-foreground font-normal">— {group.type}</span>
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {group.products.length} product{group.products.length !== 1 ? "s" : ""} •{" "}
                      {group.size}{group.sizeUnit} {containerLabel.replace("per ", "")}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {group.products.length} selected
                  </Badge>
                </div>

                <div className="space-y-2">
                  {group.suggestedCost > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Suggested: ${group.suggestedCost.toFixed(2)}/{containerLabel.replace("per ", "")}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`price-${group.key}`} className="sr-only">
                      Cost {containerLabel}
                    </Label>
                    <div className="relative flex-1 max-w-[200px]">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        id={`price-${group.key}`}
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={pricing[group.key] || ""}
                        onChange={(e) => handlePricingChange(group.key, e.target.value)}
                        className="pl-7"
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">{containerLabel}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="ghost" onClick={onBack} disabled={isImporting}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleImport} disabled={!allPricingEntered || isImporting}>
          {isImporting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Import className="w-4 h-4 mr-2" />
          )}
          Import {selectedProducts.length} Products
        </Button>
      </div>
    </div>
  );
}
