import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateCatalogProduct, useUpdateCatalogProduct, useCatalogsAdmin } from "@/hooks/platform/useProductCatalogAdmin";
import type { Tables } from "@/integrations/supabase/types";

type CatalogProduct = Tables<"catalog_products">;

interface CatalogProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: CatalogProduct | null;
  catalogId?: string;
}

const PRODUCT_TYPES = ["Color", "Developer", "Lightener", "Treatment"];
const SIZE_UNITS = ["ml", "oz", "g"];

export function CatalogProductDialog({ 
  open, 
  onOpenChange, 
  product, 
  catalogId: defaultCatalogId 
}: CatalogProductDialogProps) {
  const [catalogId, setCatalogId] = useState(defaultCatalogId || "");
  const [type, setType] = useState("Color");
  const [name, setName] = useState("");
  const [shade, setShade] = useState("");
  const [defaultSize, setDefaultSize] = useState("");
  const [defaultSizeUnit, setDefaultSizeUnit] = useState("ml");
  const [suggestedCost, setSuggestedCost] = useState("");

  const { data: catalogs } = useCatalogsAdmin();
  const createProduct = useCreateCatalogProduct();
  const updateProduct = useUpdateCatalogProduct();
  const isEditing = !!product;

  useEffect(() => {
    if (product) {
      setCatalogId(product.catalog_id || "");
      setType(product.type);
      setName(product.name);
      setShade(product.shade || "");
      setDefaultSize(product.default_size?.toString() || "");
      setDefaultSizeUnit(product.default_size_unit || "ml");
      setSuggestedCost(product.suggested_cost_per_unit?.toString() || "");
    } else {
      setCatalogId(defaultCatalogId || "");
      setType("Color");
      setName("");
      setShade("");
      setDefaultSize("");
      setDefaultSizeUnit("ml");
      setSuggestedCost("");
    }
  }, [product, defaultCatalogId, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalName = name || shade || "Unnamed";
    const productData = {
      catalog_id: catalogId,
      type,
      name: finalName,
      shade: shade || undefined,
      default_size: defaultSize ? parseFloat(defaultSize) : undefined,
      default_size_unit: defaultSizeUnit,
      suggested_cost_per_unit: suggestedCost ? parseFloat(suggestedCost) : undefined,
    };

    if (isEditing && product) {
      await updateProduct.mutateAsync({
        id: product.id,
        ...productData,
      });
    } else {
      await createProduct.mutateAsync(productData);
    }

    onOpenChange(false);
  };

  const activeCatalogs = catalogs?.filter((c) => c.is_active) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Product" : "Add Product"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="catalog">Catalog *</Label>
            <Select value={catalogId} onValueChange={setCatalogId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select catalog..." />
              </SelectTrigger>
              <SelectContent>
                {activeCatalogs.map((catalog) => (
                  <SelectItem key={catalog.id} value={catalog.id}>
                    {catalog.brand} - {catalog.line}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shade">Shade Code {type === "Color" ? "*" : ""}</Label>
              <Input
                id="shade"
                value={shade}
                onChange={(e) => setShade(e.target.value)}
                placeholder="e.g., 6N, 7RV"
                required={type === "Color"}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">
              {type === "Color" ? "Shade Name" : "Product Name"} {type !== "Color" ? "*" : ""}
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={type === "Color" ? "e.g., Mirage Natural (optional)" : "e.g., 20 Volume Developer"}
              required={type !== "Color"}
            />
            {type === "Color" && (
              <p className="text-xs text-muted-foreground">Optional — descriptive name for this shade</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="defaultSize">Default Size</Label>
              <Input
                id="defaultSize"
                type="number"
                step="0.01"
                value={defaultSize}
                onChange={(e) => setDefaultSize(e.target.value)}
                placeholder="e.g., 60"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sizeUnit">Unit</Label>
              <Select value={defaultSizeUnit} onValueChange={setDefaultSizeUnit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SIZE_UNITS.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="suggestedCost">Suggested Cost per Tube ($)</Label>
            <Input
              id="suggestedCost"
              type="number"
              step="0.01"
              value={suggestedCost}
              onChange={(e) => setSuggestedCost(e.target.value)}
              placeholder="e.g., 10.80"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createProduct.isPending || updateProduct.isPending || !catalogId}
            >
              {createProduct.isPending || updateProduct.isPending 
                ? "Saving..." 
                : isEditing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
