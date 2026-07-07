import { motion } from "framer-motion";
import { X, Trash2, EyeOff, Download, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Product } from "@/hooks/useProducts";

interface BatchActionsBarProps {
  selectedProducts: Product[];
  onClearSelection: () => void;
  onDeleteSelected: () => void;
  onSetInactive: () => void;
  onExportSelected: () => void;
  onBulkEdit: () => void;
  isDeleting?: boolean;
  isUpdating?: boolean;
}

export function BatchActionsBar({
  selectedProducts,
  onClearSelection,
  onDeleteSelected,
  onSetInactive,
  onExportSelected,
  onBulkEdit,
  isDeleting = false,
  isUpdating = false,
}: BatchActionsBarProps) {
  if (selectedProducts.length === 0) return null;

  const activeCount = selectedProducts.filter(p => p.isActive).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border shadow-lg">
        <div className="flex items-center gap-2 pr-3 border-r border-border">
          <span className="text-sm font-medium text-foreground">
            {selectedProducts.length} selected
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onClearSelection}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={onBulkEdit}
          >
            <Pencil className="w-4 h-4" />
            Bulk Edit
          </Button>

          {activeCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={onSetInactive}
              disabled={isUpdating}
            >
              <EyeOff className="w-4 h-4" />
              Set Inactive
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={onExportSelected}
          >
            <Download className="w-4 h-4" />
            Export
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                className="gap-2"
                disabled={isDeleting}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {selectedProducts.length} products?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the selected products
                  from your inventory.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDeleteSelected}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete {selectedProducts.length} Products
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </motion.div>
  );
}
