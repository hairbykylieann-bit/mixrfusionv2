import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PlatformLayout } from "@/components/platform/PlatformLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Plus, Package } from "lucide-react";
import { useCatalogsAdmin, useCatalogProductsAdmin, useDeleteCatalogProduct } from "@/hooks/platform/useProductCatalogAdmin";
import { CatalogProductDialog } from "@/components/platform/CatalogProductDialog";
import { CatalogProductSection } from "@/components/platform/CatalogProductSection";
import {
  groupCatalogProductsByTone,
  groupCatalogNonColorProducts,
  getCatalogProductStats,
} from "@/lib/catalogUtils";
import type { Tables } from "@/integrations/supabase/types";

type CatalogProduct = Tables<"catalog_products">;

export default function PlatformCatalogDetail() {
  const { catalogId } = useParams<{ catalogId: string }>();
  const navigate = useNavigate();
  
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<CatalogProduct | null>(null);
  
  const { data: catalogs, isLoading: catalogsLoading } = useCatalogsAdmin();
  const { data: products, isLoading: productsLoading } = useCatalogProductsAdmin(catalogId);
  const deleteProduct = useDeleteCatalogProduct();

  const catalog = catalogs?.find((c) => c.id === catalogId);
  const isLoading = catalogsLoading || productsLoading;

  // Group products by tone for colors, by type for others
  const toneGroups = products ? groupCatalogProductsByTone(products) : [];
  const typeGroups = products ? groupCatalogNonColorProducts(products) : [];
  const stats = products ? getCatalogProductStats(products) : null;

  const handleEditProduct = (product: CatalogProduct) => {
    setEditingProduct(product);
    setProductDialogOpen(true);
  };

  const handleDeleteProduct = (product: CatalogProduct) => {
    setDeletingProduct(product);
  };

  const confirmDelete = async () => {
    if (deletingProduct) {
      await deleteProduct.mutateAsync(deletingProduct.id);
      setDeletingProduct(null);
    }
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setProductDialogOpen(true);
  };

  if (isLoading) {
    return (
      <PlatformLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PlatformLayout>
    );
  }

  if (!catalog) {
    return (
      <PlatformLayout>
        <div className="text-center py-12">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Catalog not found</h2>
          <p className="text-muted-foreground mb-4">
            This catalog may have been deleted or you don't have access.
          </p>
          <Button onClick={() => navigate("/platform/catalogs")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Catalogs
          </Button>
        </div>
      </PlatformLayout>
    );
  }

  return (
    <PlatformLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/platform/catalogs")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">
                {catalog.brand} {catalog.line}
              </h1>
              {!catalog.is_active && (
                <Badge variant="secondary">Inactive</Badge>
              )}
            </div>
            {catalog.description && (
              <p className="text-muted-foreground mt-1">{catalog.description}</p>
            )}
          </div>
          <Button onClick={handleAddProduct}>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>

        {/* Stats */}
        {stats && (
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="font-semibold text-2xl">{stats.total}</span>
                  <span className="text-muted-foreground ml-2">total products</span>
                </div>
                {stats.colorCount > 0 && (
                  <Badge
                    variant="outline"
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => document.getElementById("section-Colors")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  >
                    {stats.colorCount} Colors
                  </Badge>
                )}
                {stats.developerCount > 0 && (
                  <Badge
                    variant="outline"
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => document.getElementById("section-Developer")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  >
                    {stats.developerCount} Developers
                  </Badge>
                )}
                {stats.lightenerCount > 0 && (
                  <Badge
                    variant="outline"
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => document.getElementById("section-Lightener")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  >
                    {stats.lightenerCount} Lighteners
                  </Badge>
                )}
                {stats.treatmentCount > 0 && (
                  <Badge
                    variant="outline"
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => document.getElementById("section-Treatment")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  >
                    {stats.treatmentCount} Treatments
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Products by Tone */}
        {toneGroups.length > 0 && (
          <div id="section-Colors" className="space-y-8 scroll-mt-4">
            {toneGroups.map((group) => (
              <CatalogProductSection
                key={group.tone}
                title={group.name}
                subtitle={group.tone}
                products={group.products}
                onEditProduct={handleEditProduct}
                onDeleteProduct={handleDeleteProduct}
                variant="color"
              />
            ))}
          </div>
        )}

        {/* Non-Color Products by Type */}
        {typeGroups.length > 0 && (
          <div className="space-y-8 mt-8">
            {typeGroups.map((group) => (
              <CatalogProductSection
                key={group.type}
                id={`section-${group.type}`}
                title={group.type}
                products={group.products}
                onEditProduct={handleEditProduct}
                onDeleteProduct={handleDeleteProduct}
                variant="other"
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {products?.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No products yet</h3>
              <p className="text-muted-foreground mb-4">
                Add products to this catalog to get started
              </p>
              <Button onClick={handleAddProduct}>
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Product Dialog */}
      <CatalogProductDialog
        open={productDialogOpen}
        onOpenChange={(open) => {
          setProductDialogOpen(open);
          if (!open) setEditingProduct(null);
        }}
        product={editingProduct}
        catalogId={catalogId}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingProduct}
        onOpenChange={(open) => !open && setDeletingProduct(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingProduct?.shade || deletingProduct?.name}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PlatformLayout>
  );
}
