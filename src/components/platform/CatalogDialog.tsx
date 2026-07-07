import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateCatalog, useUpdateCatalog } from "@/hooks/platform/useProductCatalogAdmin";
import type { Tables } from "@/integrations/supabase/types";

type ProductCatalog = Tables<"product_catalogs">;

interface CatalogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalog?: ProductCatalog | null;
}

export function CatalogDialog({ open, onOpenChange, catalog }: CatalogDialogProps) {
  const [brand, setBrand] = useState("");
  const [line, setLine] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  const createCatalog = useCreateCatalog();
  const updateCatalog = useUpdateCatalog();
  const isEditing = !!catalog;

  useEffect(() => {
    if (catalog) {
      setBrand(catalog.brand);
      setLine(catalog.line);
      setDescription(catalog.description || "");
      setLogoUrl(catalog.logo_url || "");
    } else {
      setBrand("");
      setLine("");
      setDescription("");
      setLogoUrl("");
    }
  }, [catalog, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing && catalog) {
      await updateCatalog.mutateAsync({
        id: catalog.id,
        brand,
        line,
        description: description || null,
        logo_url: logoUrl || null,
      });
    } else {
      await createCatalog.mutateAsync({
        brand,
        line,
        description: description || undefined,
        logo_url: logoUrl || undefined,
      });
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Catalog" : "Add Catalog"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="brand">Brand *</Label>
            <Input
              id="brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g., Redken, Matrix, Wella"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="line">Product Line *</Label>
            <Input
              id="line"
              value={line}
              onChange={(e) => setLine(e.target.value)}
              placeholder="e.g., Shades EQ, SoColor, Koleston"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this product line..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input
              id="logoUrl"
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createCatalog.isPending || updateCatalog.isPending}
            >
              {createCatalog.isPending || updateCatalog.isPending 
                ? "Saving..." 
                : isEditing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
