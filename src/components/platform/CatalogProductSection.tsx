import type { Tables } from "@/integrations/supabase/types";
import { CatalogProductCard } from "./CatalogProductCard";

type CatalogProduct = Tables<"catalog_products">;

interface CatalogProductSectionProps {
  id?: string;
  title: string;
  subtitle?: string;
  products: CatalogProduct[];
  onEditProduct: (product: CatalogProduct) => void;
  onDeleteProduct: (product: CatalogProduct) => void;
  variant?: "color" | "other";
}

export function CatalogProductSection({
  id,
  title,
  subtitle,
  products,
  onEditProduct,
  onDeleteProduct,
  variant = "color",
}: CatalogProductSectionProps) {
  if (products.length === 0) return null;

  return (
    <div id={id} className="space-y-3 scroll-mt-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <span className="text-sm text-muted-foreground">
          {products.length} {products.length === 1 ? "shade" : "shades"}
        </span>
      </div>
      <div
        className={
          variant === "color"
            ? "grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2"
            : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
        }
      >
        {products.map((product) => (
          <CatalogProductCard
            key={product.id}
            product={product}
            onEdit={onEditProduct}
            onDelete={onDeleteProduct}
            variant={variant}
          />
        ))}
      </div>
    </div>
  );
}
