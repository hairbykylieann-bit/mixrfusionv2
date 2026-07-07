import { CheckSquare, Square, XSquare, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Product } from "@/hooks/useProducts";

interface SelectionToolbarProps {
  products: Product[];
  filteredProducts: Product[];
  selectedIds: Set<string>;
  onSelectAll: () => void;
  onSelectFiltered: () => void;
  onClearSelection: () => void;
  canManage: boolean;
}

export function SelectionToolbar({
  products,
  filteredProducts,
  selectedIds,
  onSelectAll,
  onSelectFiltered,
  onClearSelection,
  canManage,
}: SelectionToolbarProps) {
  if (!canManage) return null;

  const allSelected = products.length > 0 && selectedIds.size === products.length;
  const filteredSelected = filteredProducts.length > 0 && 
    filteredProducts.every(p => selectedIds.has(p.id));
  const hasSelection = selectedIds.size > 0;
  const showFilteredOption = filteredProducts.length < products.length;

  return (
    <div className="flex items-center gap-2 py-2 px-1 border-b border-border mb-4">
      <Button
        variant={allSelected ? "secondary" : "ghost"}
        size="sm"
        className="gap-2 text-sm"
        onClick={onSelectAll}
      >
        {allSelected ? (
          <CheckSquare className="w-4 h-4" />
        ) : (
          <Square className="w-4 h-4" />
        )}
        Select All ({products.length})
      </Button>

      {showFilteredOption && (
        <Button
          variant={filteredSelected ? "secondary" : "ghost"}
          size="sm"
          className="gap-2 text-sm"
          onClick={onSelectFiltered}
        >
          <Filter className="w-4 h-4" />
          Select Filtered ({filteredProducts.length})
        </Button>
      )}

      {hasSelection && (
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-sm text-muted-foreground"
          onClick={onClearSelection}
        >
          <XSquare className="w-4 h-4" />
          Clear ({selectedIds.size})
        </Button>
      )}
    </div>
  );
}
