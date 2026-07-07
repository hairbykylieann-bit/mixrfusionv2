import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

export interface SalonBowl {
  id: string;
  tenant_id: string;
  name: string;
  photo_url: string | null;
  tare_weight: number;
  tare_unit: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useSalonBowls() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["salon_bowls", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salon_bowls" as any)
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as SalonBowl[];
    },
  });

  const createBowl = useMutation({
    mutationFn: async (input: { name: string; photo_url: string | null; tare_weight: number; tare_unit: string }) => {
      if (!tenantId) throw new Error("Missing tenant");
      const { data, error } = await supabase
        .from("salon_bowls" as any)
        .insert({ ...input, tenant_id: tenantId })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as SalonBowl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salon_bowls", tenantId] });
      toast.success("Bowl saved");
    },
    onError: (e: any) => toast.error(e.message || "Failed to save bowl"),
  });

  const updateBowl = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<SalonBowl> & { id: string }) => {
      const { error } = await supabase
        .from("salon_bowls" as any)
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salon_bowls", tenantId] });
      toast.success("Bowl updated");
    },
    onError: (e: any) => toast.error(e.message || "Failed to update bowl"),
  });

  const deleteBowl = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("salon_bowls" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salon_bowls", tenantId] });
      toast.success("Bowl deleted");
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete bowl"),
  });

  return {
    bowls: query.data || [],
    isLoading: query.isLoading,
    createBowl: createBowl.mutateAsync,
    updateBowl: updateBowl.mutateAsync,
    deleteBowl: deleteBowl.mutateAsync,
    isMutating: createBowl.isPending || updateBowl.isPending || deleteBowl.isPending,
  };
}
