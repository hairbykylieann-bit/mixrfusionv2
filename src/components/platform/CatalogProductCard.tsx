import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pencil, Trash2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { extractLevel } from "@/lib/catalogUtils";

type CatalogProduct = Tables<"catalog_products">;

interface CatalogProductCardProps {
  product: CatalogProduct;
  onEdit: (product: CatalogProduct) => void;
  onDelete: (product: CatalogProduct) => void;
  variant?: "color" | "other";
}

export function CatalogProductCard({
  product,
  onEdit,
  onDelete,
  variant = "color",
}: CatalogProductCardProps) {
  const level = extractLevel(product.shade);
  const displayShade = product.shade || product.name;

  if (variant === "color") {
    return (
      <Card
        className="group relative p-3 cursor-pointer hover:border-primary transition-colors"
        onClick={() => onEdit(product)}
      >
        <div className="text-center">
          <div className="text-lg font-semibold">{displayShade}</div>
          {product.name && product.name !== product.shade && (
            <div className="text-xs text-muted-foreground truncate">{product.name}</div>
          )}
          {level && (
            <div className="text-xs text-muted-foreground">Level {level}</div>
          )}
        </div>
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(product);
            }}
          >
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      </Card>
    );
  }

  // Non-color products have more info
  return (
    <Card
      className="group relative p-4 cursor-pointer hover:border-primary transition-colors"
      onClick={() => onEdit(product)}
    >
      <div>
        <div className="font-medium">{product.name}</div>
        {product.default_size && (
          <div className="text-sm text-muted-foreground">
            {product.default_size} {product.default_size_unit}
          </div>
        )}
        {product.suggested_cost_per_unit !== null && product.suggested_cost_per_unit > 0 && (
          <div className="text-sm text-muted-foreground">
            ${product.suggested_cost_per_unit.toFixed(2)}/tube
          </div>
        )}
      </div>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(product);
          }}
        >
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(product);
          }}
        >
          <Trash2 className="h-3 w-3 text-destructive" />
        </Button>
      </div>
    </Card>
  );
}
