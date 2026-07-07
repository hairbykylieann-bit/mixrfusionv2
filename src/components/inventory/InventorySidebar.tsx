import { ChevronDown, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  InventoryFilters,
  countByField,
  countByLevel,
  getUniqueValues,
  getUniqueLevels,
} from "@/lib/inventoryUtils";
import type { Product } from "@/hooks/useProducts";
import { useState } from "react";

interface InventorySidebarProps {
  products: Product[];
  filters: InventoryFilters;
  onFiltersChange: (filters: InventoryFilters) => void;
  onClose?: () => void;
  className?: string;
}

interface FilterSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function FilterSection({ title, defaultOpen = true, children }: FilterSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mb-2">
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted/50 rounded-md transition-colors">
        <span>{title}</span>
        {open ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-1 space-y-0.5">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

interface FilterItemProps {
  label: string;
  count: number;
  isSelected: boolean;
  onClick: () => void;
}

function FilterItem({ label, count, isSelected, onClick }: FilterItemProps) {
  return (
    <button
      className={cn(
        "flex items-center justify-between w-full py-1.5 px-3 text-sm rounded-md transition-colors",
        isSelected
          ? "bg-primary text-primary-foreground"
          : "text-foreground hover:bg-muted/50"
      )}
      onClick={onClick}
    >
      <span className="truncate">{label}</span>
      <span
        className={cn(
          "text-xs ml-2 tabular-nums",
          isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
        )}
      >
        {count}
      </span>
    </button>
  );
}

export function InventorySidebar({
  products,
  filters,
  onFiltersChange,
  onClose,
  className,
}: InventorySidebarProps) {
  const getFilteredProducts = (excludeField?: keyof InventoryFilters) => {
    return products.filter((p) => {
      if (excludeField !== "brand" && filters.brand && p.brand !== filters.brand) return false;
      if (excludeField !== "line" && filters.line && p.line !== filters.line) return false;
      if (excludeField !== "type" && filters.type && p.type !== filters.type) return false;
      return true;
    });
  };

  const brands = getUniqueValues(products, "brand");
  const brandCounts = countByField(getFilteredProducts("brand"), "brand");

  const linesProducts = filters.brand
    ? products.filter((p) => p.brand === filters.brand)
    : products;
  const lines = getUniqueValues(linesProducts, "line");
  const lineCounts = countByField(getFilteredProducts("line"), "line");

  const types = getUniqueValues(products, "type");
  const typeCounts = countByField(getFilteredProducts("type"), "type");

  // Individual levels (only for color products)
  const colorProducts = getFilteredProducts().filter((p) => p.type === "Color");
  const levels = getUniqueLevels(colorProducts);
  const levelCounts = countByLevel(colorProducts);

  const handleBrandClick = (brand: string | null) => {
    onFiltersChange({
      ...filters,
      brand: filters.brand === brand ? null : brand,
      line: filters.brand === brand ? filters.line : null,
    });
  };

  const handleLineClick = (line: string | null) => {
    onFiltersChange({
      ...filters,
      line: filters.line === line ? null : line,
    });
  };

  const handleTypeClick = (type: string | null) => {
    onFiltersChange({
      ...filters,
      type: filters.type === type ? null : type,
      level: type !== "Color" ? null : filters.level,
    });
  };

  const handleLevelClick = (level: number | null) => {
    onFiltersChange({
      ...filters,
      level: filters.level === level ? null : level,
    });
  };

  const hasActiveFilters =
    filters.brand || filters.line || filters.type || filters.level !== null;

  return (
    <div
      className={cn(
        "flex flex-col bg-card border-r border-border h-full",
        className
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="font-semibold text-foreground">Filters</h2>
        <div className="flex items-center gap-1">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={() =>
                onFiltersChange({
                  brand: null,
                  line: null,
                  type: null,
                  level: null,
                  tone: null,
                })
              }
            >
              Clear all
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 px-2 py-3">
        <FilterSection title="Brands">
          <FilterItem
            label="All Brands"
            count={products.length}
            isSelected={!filters.brand}
            onClick={() => handleBrandClick(null)}
          />
          {brands.map((brand) => (
            <FilterItem
              key={brand}
              label={brand}
              count={brandCounts[brand] || 0}
              isSelected={filters.brand === brand}
              onClick={() => handleBrandClick(brand)}
            />
          ))}
        </FilterSection>

        {lines.length > 0 && (
          <FilterSection title="Product Lines">
            <FilterItem
              label="All Lines"
              count={
                filters.brand
                  ? products.filter((p) => p.brand === filters.brand).length
                  : products.length
              }
              isSelected={!filters.line}
              onClick={() => handleLineClick(null)}
            />
            {lines.map((line) => (
              <FilterItem
                key={line}
                label={line}
                count={lineCounts[line] || 0}
                isSelected={filters.line === line}
                onClick={() => handleLineClick(line)}
              />
            ))}
          </FilterSection>
        )}

        <FilterSection title="Type">
          <FilterItem
            label="All Types"
            count={getFilteredProducts("type").length}
            isSelected={!filters.type}
            onClick={() => handleTypeClick(null)}
          />
          {types.map((type) => (
            <FilterItem
              key={type}
              label={type}
              count={typeCounts[type] || 0}
              isSelected={filters.type === type}
              onClick={() => handleTypeClick(type)}
            />
          ))}
        </FilterSection>

        {(filters.type === "Color" || (!filters.type && colorProducts.length > 0)) && levels.length > 0 && (
          <FilterSection title="Level" defaultOpen={false}>
            <FilterItem
              label="All Levels"
              count={colorProducts.length}
              isSelected={filters.level === null}
              onClick={() => handleLevelClick(null)}
            />
            {levels.map((level) => (
              <FilterItem
                key={level}
                label={`Level ${level}`}
                count={levelCounts[level] || 0}
                isSelected={filters.level === level}
                onClick={() => handleLevelClick(level)}
              />
            ))}
          </FilterSection>
        )}
      </ScrollArea>
    </div>
  );
}
