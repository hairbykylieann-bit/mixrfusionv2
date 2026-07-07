import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProducts } from "@/hooks/useProducts";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface InventoryUpdateRow {
  productId: string;
  matchedName: string;
  currentStock: number;
  newStock: number;
  confidence: number;
}

export interface InventoryProposal {
  updates: InventoryUpdateRow[];
  unmatched: string[];
}

export type InventoryStatus = "idle" | "parsing" | "review" | "applying";

export function useMiraInventory() {
  const { products } = useProducts();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<InventoryStatus>("idle");
  const [proposal, setProposal] = useState<InventoryProposal | null>(null);
  const [error, setError] = useState<string | null>(null);

  const propose = useCallback(
    async (transcription: string) => {
      setStatus("parsing");
      setError(null);
      try {
        const compact = products
          .filter((p) => p.isActive)
          .map((p) => ({
            id: p.id,
            name: p.name,
            brand: p.brand,
            line: p.line || null,
            shade: p.shade || null,
            type: p.type,
            stock: Number(p.stock) || 0,
          }));

        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mira-inventory-parse`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ transcription, products: compact }),
          },
        );

        if (!res.ok) {
          if (res.status === 429) throw new Error("Rate limit reached. Try again in a moment.");
          if (res.status === 402) throw new Error("AI credits exhausted. Add credits in workspace settings.");
          throw new Error(`Parse failed (${res.status})`);
        }

        const data = (await res.json()) as InventoryProposal;
        setProposal(data);
        setStatus("review");
        return data;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to parse inventory update";
        setError(msg);
        setStatus("idle");
        toast.error(msg);
        return null;
      }
    },
    [products],
  );

  const updateRow = useCallback((productId: string, newStock: number) => {
    setProposal((prev) =>
      prev
        ? {
            ...prev,
            updates: prev.updates.map((u) =>
              u.productId === productId ? { ...u, newStock } : u,
            ),
          }
        : prev,
    );
  }, []);

  const removeRow = useCallback((productId: string) => {
    setProposal((prev) =>
      prev ? { ...prev, updates: prev.updates.filter((u) => u.productId !== productId) } : prev,
    );
  }, []);

  const cancel = useCallback(() => {
    setProposal(null);
    setStatus("idle");
    setError(null);
  }, []);

  const apply = useCallback(async () => {
    if (!proposal || proposal.updates.length === 0) return false;
    setStatus("applying");
    try {
      const results = await Promise.all(
        proposal.updates.map(async (row) => {
          const delta = row.newStock - row.currentStock;
          if (delta === 0) return { ok: true, row };
          const { error: rpcError } = await supabase.rpc("adjust_product_stock", {
            p_product_id: row.productId,
            p_delta: delta,
          });
          return { ok: !rpcError, row, error: rpcError?.message };
        }),
      );

      const failed = results.filter((r) => !r.ok);
      const succeeded = results.length - failed.length;

      await queryClient.invalidateQueries({ queryKey: ["products"] });

      if (failed.length === 0) {
        toast.success(`Updated ${succeeded} product${succeeded === 1 ? "" : "s"}`);
        setProposal(null);
        setStatus("idle");
        return true;
      }

      toast.error(`Updated ${succeeded}, failed ${failed.length}. Review remaining rows.`);
      setProposal((prev) =>
        prev
          ? {
              ...prev,
              updates: prev.updates.filter((u) => failed.some((f) => f.row.productId === u.productId)),
            }
          : prev,
      );
      setStatus("review");
      return false;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to apply updates";
      toast.error(msg);
      setStatus("review");
      return false;
    }
  }, [proposal, queryClient]);

  return { status, proposal, error, propose, apply, cancel, updateRow, removeRow };
}
