import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlatformLayout } from "@/components/platform/PlatformLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Package, Pencil, TrendingUp, Users, Upload, ChevronRight } from "lucide-react";
import { useCatalogsAdmin, useImportStats } from "@/hooks/platform/useProductCatalogAdmin";
import { CatalogDialog } from "@/components/platform/CatalogDialog";
import { CatalogProductDialog } from "@/components/platform/CatalogProductDialog";
import { CatalogProductsTable } from "@/components/platform/CatalogProductsTable";
import { BulkImportDialog } from "@/components/platform/BulkImportDialog";
import type { Tables } from "@/integrations/supabase/types";

type ProductCatalog = Tables<"product_catalogs">;

export default function PlatformCatalogs() {
  const navigate = useNavigate();
  const [catalogDialogOpen, setCatalogDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [editingCatalog, setEditingCatalog] = useState<ProductCatalog | null>(null);
  const { data: catalogs, isLoading: catalogsLoading } = useCatalogsAdmin();
  const { data: importStats, isLoading: statsLoading } = useImportStats();

  // Group catalogs by brand
  const catalogsByBrand = catalogs?.reduce((acc, catalog) => {
    if (!acc[catalog.brand]) {
      acc[catalog.brand] = [];
    }
    acc[catalog.brand].push(catalog);
    return acc;
  }, {} as Record<string, ProductCatalog[]>) || {};

  const handleEditCatalog = (e: React.MouseEvent, catalog: ProductCatalog) => {
    e.stopPropagation();
    setEditingCatalog(catalog);
    setCatalogDialogOpen(true);
  };

  const handleCatalogClick = (catalogId: string) => {
    navigate(`/platform/catalogs/${catalogId}`);
  };

  return (
    <PlatformLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Product Catalogs</h1>
            <p className="text-muted-foreground">
              Manage the master product library for all tenants
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setBulkImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Bulk Import
            </Button>
            <Button variant="outline" onClick={() => setProductDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
            <Button onClick={() => {
              setEditingCatalog(null);
              setCatalogDialogOpen(true);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Catalog
            </Button>
          </div>
        </div>

        <Tabs defaultValue="catalogs">
          <TabsList>
            <TabsTrigger value="catalogs">
              <Package className="mr-2 h-4 w-4" />
              Catalogs
            </TabsTrigger>
            <TabsTrigger value="products">
              <Package className="mr-2 h-4 w-4" />
              All Products
            </TabsTrigger>
            <TabsTrigger value="stats">
              <TrendingUp className="mr-2 h-4 w-4" />
              Import Stats
            </TabsTrigger>
          </TabsList>

          <TabsContent value="catalogs" className="space-y-6 mt-6">
            {catalogsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading catalogs...</div>
            ) : Object.entries(catalogsByBrand).length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">No catalogs yet</h3>
                  <p className="text-muted-foreground mb-4">Add your first product catalog to get started</p>
                  <Button onClick={() => setCatalogDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Catalog
                  </Button>
                </CardContent>
              </Card>
            ) : (
              Object.entries(catalogsByBrand).map(([brand, brandCatalogs]) => (
                <div key={brand} className="space-y-3">
                  <h2 className="text-xl font-semibold">{brand}</h2>
                  <div className="grid gap-3">
                    {brandCatalogs.map((catalog) => (
                      <Card 
                        key={catalog.id} 
                        className={`cursor-pointer hover:border-primary transition-colors ${!catalog.is_active ? "opacity-60" : ""}`}
                        onClick={() => handleCatalogClick(catalog.id)}
                      >
                        <CardContent className="py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              {catalog.logo_url && (
                                <img 
                                  src={catalog.logo_url} 
                                  alt={catalog.line} 
                                  className="h-10 w-10 rounded object-contain"
                                />
                              )}
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-medium">{catalog.line}</h3>
                                  {!catalog.is_active && (
                                    <Badge variant="secondary">Inactive</Badge>
                                  )}
                                </div>
                                {catalog.description && (
                                  <p className="text-sm text-muted-foreground">{catalog.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-sm text-muted-foreground">
                                {catalog.product_count || 0} products
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleEditCatalog(e, catalog)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))
            )}

          </TabsContent>

          <TabsContent value="products" className="mt-6">
            <CatalogProductsTable />
          </TabsContent>

          <TabsContent value="stats" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Import Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading stats...</div>
                ) : !importStats?.length ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No import data yet
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Brand / Line</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Tenants Using</TableHead>
                        <TableHead className="text-right">Total Imports</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importStats.slice(0, 20).map((stat) => (
                        <TableRow key={stat.id}>
                          <TableCell>
                            <div className="font-medium">{stat.name}</div>
                            {stat.shade && (
                              <div className="text-sm text-muted-foreground">{stat.shade}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>{stat.brand}</div>
                            <div className="text-sm text-muted-foreground">{stat.line}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{stat.type}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={stat.tenant_count > 0 ? "default" : "secondary"}>
                              {stat.tenant_count}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{stat.total_imports}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <CatalogDialog
        open={catalogDialogOpen}
        onOpenChange={setCatalogDialogOpen}
        catalog={editingCatalog}
      />

      <CatalogProductDialog
        open={productDialogOpen}
        onOpenChange={setProductDialogOpen}
      />

      <BulkImportDialog
        open={bulkImportOpen}
        onOpenChange={setBulkImportOpen}
      />
    </PlatformLayout>
  );
}
