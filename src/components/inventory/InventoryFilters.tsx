import { Filter, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export type StatusFilter = "all" | "in-stock" | "low" | "out";
export type SortBy = "stock" | "tone" | "level";

interface InventoryFiltersProps {
  statusFilter: StatusFilter;
  onStatusFilterChange: (filter: StatusFilter) => void;
  sortBy: SortBy;
  onSortByChange: (sort: SortBy) => void;
}

const statusLabels: Record<StatusFilter, string> = {
  all: "All Products",
  "in-stock": "In Stock",
  low: "Low Stock",
  out: "Out of Stock",
};

const sortLabels: Record<SortBy, string> = {
  stock: "Stock Level",
  tone: "Shade / Tone",
  level: "Level",
};

export function InventoryFilters({
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange,
}: InventoryFiltersProps) {
  const activeFilterCount = statusFilter !== "all" ? 1 : 0;

  return (
    <div className="flex gap-2">
      {/* Status & Group Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filter</span>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={statusFilter}
            onValueChange={(v) => onStatusFilterChange(v as StatusFilter)}
          >
            {(Object.keys(statusLabels) as StatusFilter[]).map((key) => (
              <DropdownMenuRadioItem key={key} value={key}>
                {statusLabels[key]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sort Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowUpDown className="w-4 h-4" />
            <span className="hidden sm:inline">{sortLabels[sortBy]}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>Sort by</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={sortBy}
            onValueChange={(v) => onSortByChange(v as SortBy)}
          >
            {(Object.keys(sortLabels) as SortBy[]).map((key) => (
              <DropdownMenuRadioItem key={key} value={key}>
                {sortLabels[key]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}