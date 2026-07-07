import { ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InventoryFilters, getToneFamilyName } from "@/lib/inventoryUtils";
import { cn } from "@/lib/utils";

interface InventoryBreadcrumbProps {
  filters: InventoryFilters;
  onFiltersChange: (filters: InventoryFilters) => void;
  className?: string;
}

interface BreadcrumbItemProps {
  label: string;
  onClear: () => void;
}

function BreadcrumbItem({ label, onClear }: BreadcrumbItemProps) {
  return (
    <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-sm">
      <span>{label}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClear();
        }}
        className="ml-1 hover:bg-primary/20 rounded p-0.5 transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export function InventoryBreadcrumb({
  filters,
  onFiltersChange,
  className,
}: InventoryBreadcrumbProps) {
  const hasFilters =
    filters.brand || filters.line || filters.type || filters.level !== null || filters.tone;

  if (!hasFilters) return null;

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      <span className="text-sm text-muted-foreground">Showing:</span>

      {filters.brand && (
        <>
          <BreadcrumbItem
            label={filters.brand}
            onClear={() =>
              onFiltersChange({ ...filters, brand: null, line: null })
            }
          />
          {(filters.line || filters.type || filters.level !== null || filters.tone) && (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </>
      )}

      {filters.line && (
        <>
          <BreadcrumbItem
            label={filters.line}
            onClear={() => onFiltersChange({ ...filters, line: null })}
          />
          {(filters.type || filters.level !== null || filters.tone) && (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </>
      )}

      {filters.type && (
        <>
          <BreadcrumbItem
            label={filters.type}
            onClear={() =>
              onFiltersChange({ ...filters, type: null, level: null, tone: null })
            }
          />
          {(filters.level !== null || filters.tone) && (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </>
      )}

      {filters.tone && (
        <>
          <BreadcrumbItem
            label={`${getToneFamilyName(filters.tone)} (${filters.tone})`}
            onClear={() => onFiltersChange({ ...filters, tone: null })}
          />
          {filters.level !== null && (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </>
      )}

      {filters.level !== null && (
        <BreadcrumbItem
          label={`Level ${filters.level}`}
          onClear={() => onFiltersChange({ ...filters, level: null })}
        />
      )}

      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs text-muted-foreground ml-2"
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
    </div>
  );
}