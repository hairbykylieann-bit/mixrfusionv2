import { ChevronDown, ChevronRight, X, Palette, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  InventoryFilters,
  TONE_FAMILIES,
  countByTone,
  countByLevel,
  getUniqueTones,
  getUniqueLevels,
  getUniqueValues,
  countByField,
  getToneFamilyName,
} from "@/lib/inventoryUtils";
import type { Product } from "@/hooks/useProducts";
import { useState } from "react";

interface ToneNavigatorProps {
  products: Product[];
  filters: InventoryFilters;
  onFiltersChange: (filters: InventoryFilters) => void;
  onClose?: () => void;
  className?: string;
  inactiveCount?: number;
  showInactive?: boolean;
  onShowInactive?: (inactive: boolean) => void;
}

interface NavigatorSectionProps {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function NavigatorSection({ title, icon, defaultOpen = true, children }: NavigatorSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mb-3">
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted/50 rounded-md transition-colors">
        <span className="flex items-center gap-2">
          {icon}
          {title}
        </span>
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

interface NavigatorItemProps {
  label: string;
  count: number;
  isSelected: boolean;
  onClick: () => void;
  indent?: boolean;
}

function NavigatorItem({ label, count, isSelected, onClick, indent }: NavigatorItemProps) {
  return (
    <button
      className={cn(
        "flex items-center justify-between w-full py-1.5 px-3 text-sm rounded-md transition-colors",
        indent && "pl-6",
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

export function ToneNavigator({
  products,
  filters,
  onFiltersChange,
  onClose,
  className,
  inactiveCount = 0,
  showInactive = false,
  onShowInactive,
}: ToneNavigatorProps) {
  const colorProducts = products.filter((p) => p.type === "Color");
  
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

  const contextColorProducts = colorProducts.filter((p) => {
    if (filters.brand && p.brand !== filters.brand) return false;
    if (filters.line && p.line !== filters.line) return false;
    return true;
  });
  const tones = getUniqueTones(contextColorProducts);
  const toneCounts = countByTone(contextColorProducts);

  const levels = getUniqueLevels(contextColorProducts);
  const levelCounts = countByLevel(contextColorProducts);

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

  const handleToneClick = (tone: string | null) => {
    onFiltersChange({
      ...filters,
      tone: filters.tone === tone ? null : tone,
      type: "Color",
    });
  };

  const handleLevelClick = (level: number | null) => {
    onFiltersChange({
      ...filters,
      level: filters.level === level ? null : level,
      type: "Color",
    });
  };




  const handleTypeClick = (type: string | null) => {
    onFiltersChange({
      ...filters,
      type: filters.type === type ? null : type,
      tone: type !== "Color" ? null : filters.tone,
      level: type !== "Color" ? null : filters.level,
    });
  };

  const hasActiveFilters =
    filters.brand || filters.line || filters.type || filters.tone || filters.level !== null;

  const showColorFilters = !filters.type || filters.type === "Color";

  return (
    <div
      className={cn(
        "flex flex-col bg-card border-r border-border h-full",
        className
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="font-semibold text-foreground">Navigate</h2>
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
        <NavigatorSection title="Brand" defaultOpen={true}>
          <NavigatorItem
            label="All Brands"
            count={products.length}
            isSelected={!filters.brand}
            onClick={() => handleBrandClick(null)}
          />
          {brands.map((brand) => (
            <NavigatorItem
              key={brand}
              label={brand}
              count={brandCounts[brand] || 0}
              isSelected={filters.brand === brand}
              onClick={() => handleBrandClick(brand)}
            />
          ))}
        </NavigatorSection>

        {lines.length > 0 && filters.brand && (
          <NavigatorSection title="Product Line" defaultOpen={true}>
            <NavigatorItem
              label="All Lines"
              count={linesProducts.length}
              isSelected={!filters.line}
              onClick={() => handleLineClick(null)}
            />
            {lines.map((line) => (
              <NavigatorItem
                key={line}
                label={line}
                count={lineCounts[line] || 0}
                isSelected={filters.line === line}
                onClick={() => handleLineClick(line)}
              />
            ))}
          </NavigatorSection>
        )}

        {/* Tone Families */}
        {showColorFilters && tones.length > 0 && (
          <NavigatorSection 
            title="Tone Family" 
            icon={<Palette className="h-3.5 w-3.5" />}
            defaultOpen={false}
          >
            <NavigatorItem
              label="All Tones"
              count={colorProducts.length}
              isSelected={!filters.tone}
              onClick={() => handleToneClick(null)}
            />
            {tones.map((tone) => (
              <NavigatorItem
                key={tone}
                label={`${getToneFamilyName(tone)} (${tone})`}
                count={toneCounts[tone] || 0}
                isSelected={filters.tone === tone}
                onClick={() => handleToneClick(tone)}
              />
            ))}
          </NavigatorSection>
        )}

        {/* Levels */}
        {showColorFilters && levels.length > 0 && (
          <NavigatorSection title="Level" defaultOpen={false}>
            <NavigatorItem
              label="All Levels"
              count={contextColorProducts.length}
              isSelected={filters.level === null}
              onClick={() => handleLevelClick(null)}
            />
            {levels.map((level) => (
              <NavigatorItem
                key={level}
                label={`Level ${level}`}
                count={levelCounts[level] || 0}
                isSelected={filters.level === level}
                onClick={() => handleLevelClick(level)}
              />
            ))}
          </NavigatorSection>
        )}

        <NavigatorSection title="Type" defaultOpen={false}>
          <NavigatorItem
            label="All Types"
            count={products.length}
            isSelected={!filters.type}
            onClick={() => handleTypeClick(null)}
          />
          <NavigatorItem
            label="Color"
            count={products.filter((p) => p.type === "Color").length}
            isSelected={filters.type === "Color"}
            onClick={() => handleTypeClick("Color")}
          />
          <NavigatorItem
            label="Developer"
            count={products.filter((p) => p.type === "Developer").length}
            isSelected={filters.type === "Developer"}
            onClick={() => handleTypeClick("Developer")}
          />
          <NavigatorItem
            label="Lightener"
            count={products.filter((p) => p.type === "Lightener").length}
            isSelected={filters.type === "Lightener"}
            onClick={() => handleTypeClick("Lightener")}
          />
          <NavigatorItem
            label="Treatment"
            count={products.filter((p) => p.type === "Treatment").length}
            isSelected={filters.type === "Treatment"}
            onClick={() => handleTypeClick("Treatment")}
          />
        </NavigatorSection>

        {/* Inactive section */}
        {inactiveCount > 0 && onShowInactive && (
          <div className="mt-2 pt-2 border-t border-border">
            <NavigatorItem
              label="Inactive Products"
              count={inactiveCount}
              isSelected={showInactive}
              onClick={() => onShowInactive(!showInactive)}
            />
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
