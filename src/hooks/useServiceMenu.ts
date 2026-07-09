import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { convertAmountBetweenUnits } from "@/lib/units";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTenant } from "@/contexts/TenantContext";
import { useSalonSettings } from "./useSalonSettings";
import { useRef, useEffect } from "react";

export type ComponentProductType = "color" | "lightener" | "toner";

export interface ServiceComponent {
  id?: string;
  product_type: ComponentProductType;
  product_amount: number;
  product_unit: string;
  developer_amount: number;
  developer_unit: string;
  developer_ratio: number | null;
  sort_order: number;
}

export interface ServiceMenuItem {
  id: string;
  tenant_id: string;
  name: string;
  price: number;
  // Legacy single-slot columns – kept in sync with first component so bowl/report
  // code that still reads them keeps working. Prefer `components` for new UI.
  color_amount: number;
  color_unit: string;
  developer_amount: number;
  developer_unit: string;
  product_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  components: ServiceComponent[];
}

export interface ServiceFormData {
  name: string;
  price: number;
  components: ServiceComponent[];
}

const defaultRatio = (t: ComponentProductType) => (t === "color" ? 1 : 2);

const DEFAULT_SERVICES: Array<{
  name: string;
  price: number;
  components: Array<{ product_type: ComponentProductType; product_amount: number; developer_amount: number }>;
}> = [
  { name: "Root Retouch", price: 75, components: [{ product_type: "color", product_amount: 1.5, developer_amount: 1.5 }] },
  { name: "All Over Color", price: 85, components: [{ product_type: "color", product_amount: 2, developer_amount: 2 }] },
  { name: "Partial Blonding", price: 120, components: [{ product_type: "lightener", product_amount: 3, developer_amount: 6 }] },
  { name: "Half Blonding", price: 150, components: [{ product_type: "lightener", product_amount: 4, developer_amount: 8 }] },
  { name: "Full Blonding", price: 180, components: [
    { product_type: "lightener", product_amount: 4, developer_amount: 8 },
    { product_type: "color", product_amount: 1, developer_amount: 1 },
  ] },
];

// Sync the legacy service_menu columns with the first component so downstream
// consumers (NewBowl overage warning, BowlCard breakdown) keep functioning.
function legacyFieldsFromComponents(components: ServiceComponent[]) {
  const first = components[0];
  if (!first) {
    return { product_type: "color", color_amount: 0, color_unit: "oz", developer_amount: 0, developer_unit: "oz" };
  }
  return {
    product_type: first.product_type,
    color_amount: first.product_amount,
    color_unit: first.product_unit,
    developer_amount: first.developer_amount,
    developer_unit: first.developer_unit,
  };
}

export function useServiceMenu() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  const { settings } = useSalonSettings();
  const preferredUnit = settings?.preferred_display_unit || "g";
  const hasSeeded = useRef(false);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["service-menu"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_menu")
        .select("*, components:service_menu_components(*)" as any)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data || []).map((row: any) => ({
        ...row,
        components: ((row.components || []) as any[])
          .map((c) => ({
            id: c.id,
            product_type: c.product_type as ComponentProductType,
            product_amount: Number(c.product_amount) || 0,
            product_unit: c.product_unit || "oz",
            developer_amount: Number(c.developer_amount) || 0,
            developer_unit: c.developer_unit || "oz",
            developer_ratio: c.developer_ratio != null ? Number(c.developer_ratio) : null,
            sort_order: Number(c.sort_order) || 0,
          }))
          .sort((a, b) => a.sort_order - b.sort_order),
      })) as ServiceMenuItem[];
    },
  });

  const seedDefaults = useMutation({
    mutationFn: async ({ tid, unit }: { tid: string; unit: string }) => {
      const convert = (ozAmount: number) => (unit === "g" ? Math.round(convertAmountBetweenUnits(ozAmount, "oz", "g")) : ozAmount);
      for (const svc of DEFAULT_SERVICES) {
        const components: ServiceComponent[] = svc.components.map((c, i) => ({
          product_type: c.product_type,
          product_amount: convert(c.product_amount),
          product_unit: unit,
          developer_amount: convert(c.developer_amount),
          developer_unit: unit,
          developer_ratio: defaultRatio(c.product_type),
          sort_order: i,
        }));
        const legacy = legacyFieldsFromComponents(components);
        const { data: inserted, error } = await supabase
          .from("service_menu")
          .insert({ tenant_id: tid, name: svc.name, price: svc.price, ...legacy })
          .select("id")
          .single();
        if (error) throw error;
        const rows = components.map((c) => ({
          service_id: inserted.id,
          tenant_id: tid,
          product_type: c.product_type,
          product_amount: c.product_amount,
          product_unit: c.product_unit,
          developer_amount: c.developer_amount,
          developer_unit: c.developer_unit,
          developer_ratio: c.developer_ratio,
          sort_order: c.sort_order,
        }));
        const { error: compErr } = await supabase.from("service_menu_components" as any).insert(rows);
        if (compErr) throw compErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-menu"] });
      queryClient.invalidateQueries({ queryKey: ["report-service-menu"] });
      queryClient.invalidateQueries({ queryKey: ["staff-report-service-menu"] });
    },
  });

  useEffect(() => {
    if (
      !isLoading &&
      services.length === 0 &&
      tenantId &&
      settings &&
      !hasSeeded.current &&
      !seedDefaults.isPending
    ) {
      hasSeeded.current = true;
      seedDefaults.mutate({ tid: tenantId, unit: preferredUnit });
    }
  }, [isLoading, services.length, tenantId, settings, preferredUnit]);

  async function writeComponents(serviceId: string, tid: string, components: ServiceComponent[]) {
    // Simple replace-all strategy: delete + insert.
    const { error: delErr } = await supabase
      .from("service_menu_components" as any)
      .delete()
      .eq("service_id", serviceId);
    if (delErr) throw delErr;
    if (components.length === 0) return;
    const rows = components.map((c, i) => ({
      service_id: serviceId,
      tenant_id: tid,
      product_type: c.product_type,
      product_amount: c.product_amount,
      product_unit: c.product_unit,
      developer_amount: c.developer_amount,
      developer_unit: c.developer_unit,
      developer_ratio: c.developer_ratio,
      sort_order: i,
    }));
    const { error } = await supabase.from("service_menu_components" as any).insert(rows);
    if (error) throw error;
  }

  const createService = useMutation({
    mutationFn: async (formData: ServiceFormData) => {
      const legacy = legacyFieldsFromComponents(formData.components);
      const { data, error } = await supabase
        .from("service_menu")
        .insert({
          tenant_id: tenantId!,
          name: formData.name,
          price: formData.price,
          ...legacy,
        })
        .select()
        .single();
      if (error) throw error;
      await writeComponents(data.id, tenantId!, formData.components);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-menu"] });
      queryClient.invalidateQueries({ queryKey: ["report-service-menu"] });
      queryClient.invalidateQueries({ queryKey: ["staff-report-service-menu"] });
      toast.success("Service added");
    },
    onError: (error: any) => {
      toast.error(error?.message?.includes("duplicate") ? "A service with that name already exists" : "Failed to add service");
    },
  });

  const updateService = useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: ServiceFormData }) => {
      const legacy = legacyFieldsFromComponents(formData.components);
      const { data, error } = await supabase
        .from("service_menu")
        .update({ name: formData.name, price: formData.price, ...legacy })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      await writeComponents(id, tenantId!, formData.components);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-menu"] });
      queryClient.invalidateQueries({ queryKey: ["report-service-menu"] });
      queryClient.invalidateQueries({ queryKey: ["staff-report-service-menu"] });
      toast.success("Service updated");
    },
    onError: () => {
      toast.error("Failed to update service");
    },
  });

  const deleteService = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_menu").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-menu"] });
      queryClient.invalidateQueries({ queryKey: ["report-service-menu"] });
      queryClient.invalidateQueries({ queryKey: ["staff-report-service-menu"] });
      toast.success("Service removed");
    },
    onError: () => {
      toast.error("Failed to remove service");
    },
  });

  return {
    services,
    isLoading,
    createService,
    updateService,
    deleteService,
  };
}
