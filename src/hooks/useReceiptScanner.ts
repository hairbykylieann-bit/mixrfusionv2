import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useStockAdjustments } from "@/hooks/useStockAdjustments";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

export interface ScannedItem {
  receipt_description: string;
  brand: string;
  product_name: string;
  shade?: string;
  quantity: number;
  matched_product_id: string;
  confidence: "high" | "medium" | "low";
  matched_product: {
    id: string;
    brand: string;
    line: string;
    name: string;
    shade: string | null;
    current_stock: number;
  } | null;
  // UI state
  skip: boolean;
  editedQuantity: number;
}

type ScanStep = "upload" | "scanning" | "review" | "applying";

export function useReceiptScanner() {
  const { tenantId } = useTenant();
  const { createAdjustment } = useStockAdjustments();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<ScanStep>("upload");
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip data URL prefix
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const scanFile = async (file: File) => {
    setError(null);
    setFileName(file.name);
    setStep("scanning");

    // Preview for images only
    if (file.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }

    try {
      const base64 = await fileToBase64(file);

      const { data, error: fnError } = await supabase.functions.invoke("scan-receipt", {
        body: {
          file: base64,
          mimeType: file.type,
          tenantId,
        },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      const scannedItems: ScannedItem[] = (data.items || []).map((item: any) => ({
        ...item,
        skip: !item.matched_product_id,
        editedQuantity: item.quantity,
      }));

      setItems(scannedItems);
      setStep("review");
    } catch (e: any) {
      console.error("Scan error:", e);
      setError(e.message || "Failed to scan receipt");
      setStep("upload");
    }
  };

  const updateItem = (index: number, updates: Partial<ScannedItem>) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    );
  };

  const applyAll = async () => {
    const toApply = items.filter((i) => !i.skip && i.matched_product);
    if (toApply.length === 0) {
      toast({ title: "Nothing to apply", description: "No matched items selected." });
      return;
    }

    setStep("applying");

    try {
      for (const item of toApply) {
        const mp = item.matched_product!;
        const newStock = mp.current_stock + item.editedQuantity;

        await createAdjustment.mutateAsync({
          productId: mp.id,
          previousStock: mp.current_stock,
          newStock,
          reason: "received_order",
          notes: `Receipt scan — ${fileName || "upload"} — ${new Date().toLocaleDateString()}`,
        });
      }

      await queryClient.invalidateQueries({ queryKey: ["products"] });

      toast({
        title: "Inventory updated!",
        description: `${toApply.length} product${toApply.length > 1 ? "s" : ""} restocked from receipt.`,
      });

      reset();
    } catch (e: any) {
      console.error("Apply error:", e);
      toast({
        title: "Error applying stock updates",
        description: e.message,
        variant: "destructive",
      });
      setStep("review");
    }
  };

  const reset = () => {
    setStep("upload");
    setItems([]);
    setError(null);
    setFileName("");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  return {
    step,
    items,
    error,
    fileName,
    previewUrl,
    scanFile,
    updateItem,
    applyAll,
    reset,
  };
}
