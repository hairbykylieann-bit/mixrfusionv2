import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Droplets, Loader2, Check, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DeveloperDefault {
  brand: string;
  line: string;
  developer_brand: string;
  developer_line: string;
}

export function PreferredDevelopersCard() {
  const queryClient = useQueryClient();

  // Fetch all active products to derive color lines and developer lines
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("brand, line, type")
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing defaults
  const { data: defaults, isLoading: defaultsLoading } = useQuery({
    queryKey: ["line-developer-defaults"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("line_developer_defaults" as any)
        .select("*");
      if (error) throw error;
      return data as any as DeveloperDefault[];
    },
  });

  // Derive distinct color lines (brand + line)
  const colorLines = useMemo(() => {
    if (!products) return [];
    const set = new Map<string, { brand: string; line: string }>();
    products.forEach((p) => {
      if ((p.type === "Color" || p.type === "Lightener") && p.brand && p.line) {
        const key = `${p.brand}|${p.line}`;
        if (!set.has(key)) set.set(key, { brand: p.brand, line: p.line });
      }
    });
    return Array.from(set.values()).sort((a, b) =>
      `${a.brand} ${a.line}`.localeCompare(`${b.brand} ${b.line}`)
    );
  }, [products]);

  // Derive distinct developer lines (brand + line)
  const developerLines = useMemo(() => {
    if (!products) return [];
    const set = new Map<string, { brand: string; line: string }>();
    products.forEach((p) => {
      if (p.type === "Developer" && p.brand && p.line) {
        const key = `${p.brand}|${p.line}`;
        if (!set.has(key)) set.set(key, { brand: p.brand, line: p.line });
      }
    });
    return Array.from(set.values()).sort((a, b) =>
      `${a.brand} ${a.line}`.localeCompare(`${b.brand} ${b.line}`)
    );
  }, [products]);

  // Build lookup from defaults
  const defaultsMap = useMemo(() => {
    const map = new Map<string, string>();
    defaults?.forEach((d) => {
      map.set(`${d.brand}|${d.line}`, `${d.developer_brand}|${d.developer_line}`);
    });
    return map;
  }, [defaults]);

  const upsertMutation = useMutation({
    mutationFn: async ({
      brand,
      line,
      developerBrand,
      developerLine,
    }: {
      brand: string;
      line: string;
      developerBrand: string;
      developerLine: string;
    }) => {
      // Get tenant_id
      const { data: tenantData } = await supabase.rpc("get_user_tenant_id");
      if (!tenantData) throw new Error("No tenant found");

      const { error } = await supabase.from("line_developer_defaults" as any).upsert(
        {
          tenant_id: tenantData,
          brand,
          line,
          developer_brand: developerBrand,
          developer_line: developerLine,
        } as any,
        { onConflict: "tenant_id,brand,line" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["line-developer-defaults"] });
      toast.success("Preferred developer updated");
    },
    onError: () => {
      toast.error("Failed to save preferred developer");
    },
  });

  const removeMutation = useMutation({
    mutationFn: async ({ brand, line }: { brand: string; line: string }) => {
      const { data: tenantData } = await supabase.rpc("get_user_tenant_id");
      if (!tenantData) throw new Error("No tenant found");

      const { error } = await supabase
        .from("line_developer_defaults" as any)
        .delete()
        .eq("tenant_id", tenantData)
        .eq("brand", brand)
        .eq("line", line);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["line-developer-defaults"] });
      toast.success("Preferred developer removed");
    },
  });

  const handleSelect = (colorBrand: string, colorLine: string, value: string) => {
    if (value === "__none__") {
      removeMutation.mutate({ brand: colorBrand, line: colorLine });
      return;
    }
    const [devBrand, devLine] = value.split("|");
    upsertMutation.mutate({
      brand: colorBrand,
      line: colorLine,
      developerBrand: devBrand,
      developerLine: devLine,
    });
  };

  const isLoading = productsLoading || defaultsLoading;

  if (isLoading) {
    return (
      <motion.div
        className="stat-card flex items-center justify-center h-48"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </motion.div>
    );
  }

  if (colorLines.length === 0) {
    return (
      <motion.div
        className="stat-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
            <Droplets className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-medium text-foreground">Preferred Developers</h3>
            <p className="text-sm text-muted-foreground">
              Add color products to your inventory to set up preferred developers.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="stat-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
          <Droplets className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-medium text-foreground">Preferred Developers</h3>
          <p className="text-sm text-muted-foreground">
            Set a default developer line for each color line. The bowl page will auto-filter developers to your preferred line.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {colorLines.map((cl) => {
          const key = `${cl.brand}|${cl.line}`;
          const currentValue = defaultsMap.get(key) || "__none__";

          return (
            <div key={key} className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {cl.brand} — {cl.line}
                </p>
              </div>
              <div className="w-56">
                <Select
                  value={currentValue}
                  onValueChange={(v) => handleSelect(cl.brand, cl.line, v)}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="No preference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No preference</SelectItem>
                    {developerLines.map((dl) => (
                      <SelectItem
                        key={`${dl.brand}|${dl.line}`}
                        value={`${dl.brand}|${dl.line}`}
                      >
                        {dl.brand} — {dl.line}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
