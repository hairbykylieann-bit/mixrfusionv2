import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Package, 
  Upload, 
  Search as SearchIcon, 
  Plus,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductImportCard } from "./ProductImportCard";
import { ProductCatalogBrowser } from "./ProductCatalogBrowser";

interface InventorySetupOptionsProps {
  onAddManually: () => void;
}

export function InventorySetupOptions({ onAddManually }: InventorySetupOptionsProps) {
  const [showImport, setShowImport] = useState(false);
  const [showCatalogBrowser, setShowCatalogBrowser] = useState(false);

  if (showImport) {
    return (
      <div className="max-w-2xl mx-auto">
        <ProductImportCard onBack={() => setShowImport(false)} />
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto text-center"
      >
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-6">
        <Package className="w-8 h-8 text-primary" />
      </div>
      
      <h2 className="text-2xl font-semibold text-foreground mb-2">
        Set Up Your Inventory
      </h2>
      <p className="text-muted-foreground mb-8">
        Choose how you'd like to add products to your inventory
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {/* Browse Product Lines - Now Active! */}
        <motion.div
          className="stat-card relative cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowCatalogBrowser(true)}
        >
          <div className="p-6 text-left">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 flex items-center justify-center mb-4">
              <SearchIcon className="w-6 h-6 text-violet-500" />
            </div>
            
            <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              Browse Product Lines
              <Sparkles className="w-4 h-4 text-violet-500" />
            </h3>
            <p className="text-sm text-muted-foreground">
              Explore curated catalogs from popular salon brands like Schwarzkopf, Wella, and more.
            </p>
          </div>
        </motion.div>

        {/* Load Starter Catalog - CSV Import */}
        <motion.div
          className="stat-card cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowImport(true)}
        >
          <div className="p-6 text-left">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            
            <h3 className="font-semibold text-foreground mb-2">
              Load Starter Catalog
            </h3>
            <p className="text-sm text-muted-foreground">
              Import your existing products from a CSV file for quick setup.
            </p>
          </div>
        </motion.div>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <Button 
        variant="outline" 
        className="mt-8 gap-2"
        onClick={onAddManually}
      >
        <Plus className="w-4 h-4" />
        Add Products Manually
      </Button>
      </motion.div>

      <ProductCatalogBrowser 
        open={showCatalogBrowser} 
        onOpenChange={setShowCatalogBrowser} 
      />
    </>
  );
}
