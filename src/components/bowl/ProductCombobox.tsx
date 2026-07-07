import { useState } from "react";
import { Check, ChevronsUpDown, Plus, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface Product {
  id: string;
  shadeCode: string;
  name: string;
  brand: string;
  productLine: string;
  type?: string;      // 'Color', 'Lightener', 'Treatment', 'Developer'
  status: "in-stock" | "low" | "out";
  cost?: number;      // Full bottle cost
  size?: number;      // Bottle size (in sizeUnit)
  sizeUnit?: string;  // 'ml', 'oz', 'g'
}

interface ProductComboboxProps {
  products: Product[];
  value: string;
  onValueChange: (value: string) => void;
  onAddNew?: () => void;
}

export function ProductCombobox({ 
  products, 
  value, 
  onValueChange,
  onAddNew 
}: ProductComboboxProps) {
  const [open, setOpen] = useState(false);

  const selectedProduct = products.find((p) => p.id === value);

  // Check if multiple brands exist
  const uniqueBrands = new Set(products.map(p => p.brand));
  const hasMultipleBrands = uniqueBrands.size > 1;

  // Group products by brand + product line
  const groupedByLine = products.reduce((acc, product) => {
    const key = hasMultipleBrands 
      ? `${product.brand} · ${product.productLine || "Other"}`
      : (product.productLine || "Other");
    if (!acc[key]) acc[key] = [];
    acc[key].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  const sortedLines = Object.keys(groupedByLine).sort();

  const getStatusColor = (status: Product["status"]) => {
    switch (status) {
      case "in-stock":
        return "text-success";
      case "low":
        return "text-warning";
      case "out":
        return "text-muted-foreground";
    }
  };

  const getStatusLabel = (status: Product["status"]) => {
    switch (status) {
      case "in-stock":
        return "In Stock";
      case "low":
        return "Low";
      case "out":
        return "Out";
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selectedProduct ? (
            <div className="flex flex-col items-start truncate">
              <span className="flex items-center gap-2">
                <span className="font-medium">{selectedProduct.shadeCode}</span>
                <span className="text-muted-foreground truncate">{selectedProduct.name}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                {selectedProduct.brand} · {selectedProduct.productLine}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">Search products...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command
          filter={(value, search) => {
            const lower = value.toLowerCase();
            const term = search.toLowerCase();
            const shadeCode = lower.split(' ')[0];
            if (shadeCode === term) return 1;
            if (shadeCode.startsWith(term)) return 0.75;
            if (lower.includes(term)) return 0.5;
            return 0;
          }}
        >
          <CommandInput placeholder="Search by shade, name, or brand..." />
          <CommandList>
            <CommandEmpty>
              <div className="py-4 text-center text-sm text-muted-foreground">
                No products found.
              </div>
            </CommandEmpty>
            {sortedLines.map((line) => (
              <CommandGroup key={line} heading={sortedLines.length > 1 ? line : undefined}>
                {groupedByLine[line].map((product) => (
                  <CommandItem
                    key={product.id}
                    value={`${product.shadeCode} ${product.name} ${product.brand} ${product.productLine} ${product.type || ''}`}
                    onSelect={() => {
                      onValueChange(product.id);
                      setOpen(false);
                    }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          value === product.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{product.shadeCode}</span>
                          <span className="text-muted-foreground truncate text-sm">
                            {product.name}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {product.brand} · {product.productLine}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <Circle className={cn("h-2 w-2 fill-current", getStatusColor(product.status))} />
                      <span className={cn("text-xs", getStatusColor(product.status))}>
                        {getStatusLabel(product.status)}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
            {onAddNew && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      onAddNew();
                      setOpen(false);
                    }}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add new product</span>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
