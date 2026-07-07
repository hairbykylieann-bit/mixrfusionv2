import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Search } from "lucide-react";
import { useAllCatalogProducts, useDeleteCatalogProduct } from "@/hooks/platform/useProductCatalogAdmin";
import { CatalogProductDialog } from "./CatalogProductDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { Tables } from "@/integrations/supabase/types";

type CatalogProduct = Tables<"catalog_products">;

export function CatalogProductsTable() {
  const [search, setSearch] = useState("");
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: products, isLoading } = useAllCatalogProducts();
  const deleteProduct = useDeleteCatalogProduct();

  const filteredProducts = products?.filter((p) => {
    const searchLower = search.toLowerCase();
    const catalog = p.product_catalogs as { brand: string; line: string; is_active: boolean } | null;
    return (
      p.name.toLowerCase().includes(searchLower) ||
      p.shade?.toLowerCase().includes(searchLower) ||
      p.type.toLowerCase().includes(searchLower) ||
      catalog?.brand.toLowerCase().includes(searchLower) ||
      catalog?.line.toLowerCase().includes(searchLower)
    );
  });

  const handleDelete = async () => {
    if (deletingId) {
      await deleteProduct.mutateAsync(deletingId);
      setDeletingId(null);
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type.toLowerCase()) {
      case "color":
        return "default";
      case "developer":
        return "secondary";
      case "lightener":
        return "outline";
      default:
        return "secondary";
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading products...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Brand / Line</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Shade</TableHead>
              <TableHead>Default Size</TableHead>
              <TableHead>Cost/Tube</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts?.map((product) => {
                const catalog = product.product_catalogs as { brand: string; line: string; is_active: boolean } | null;
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="font-medium">{catalog?.brand}</div>
                      <div className="text-sm text-muted-foreground">{catalog?.line}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getTypeBadgeVariant(product.type)}>
                        {product.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.shade || "—"}</TableCell>
                    <TableCell>
                      {product.default_size 
                        ? `${product.default_size} ${product.default_size_unit || "ml"}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {product.suggested_cost_per_unit 
                        ? `$${product.suggested_cost_per_unit.toFixed(2)}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingProduct(product as CatalogProduct)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingId(product.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <CatalogProductDialog
        open={!!editingProduct}
        onOpenChange={(open) => !open && setEditingProduct(null)}
        product={editingProduct}
      />

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this product from the catalog. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
