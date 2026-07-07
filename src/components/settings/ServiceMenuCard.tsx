import { useState, useMemo } from "react";
// Canonical unit math — local duplicates removed (they used fluid-oz 29.5735 and disagreed with the rest of the app)
import { convertAmountBetweenUnits as convertAmount, convertToGrams as toMl } from "@/lib/units";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronUp,
  Loader2, Scissors, TrendingUp, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  useServiceMenu,
  ServiceFormData,
  ServiceComponent,
  ComponentProductType,
} from "@/hooks/useServiceMenu";
import { useProducts } from "@/hooks/useProducts";
import { useSalonSettings } from "@/hooks/useSalonSettings";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CostBreakdown {
  brandLine: string;
  brand: string;
  line: string;
  productType: ComponentProductType;
  colorCost: number;
  developerCost: number | null;
  totalProductCost: number;
  developerLabel: string;
  developerUsingFallback: boolean;
  developerMissing: boolean;
}


const TYPE_LABEL: Record<ComponentProductType, string> = {
  color: "Color",
  lightener: "Lightener",
  toner: "Toner",
};

const DEFAULT_RATIO: Record<ComponentProductType, number> = {
  color: 1,
  lightener: 2,
  toner: 2,
};

function newComponent(defaultUnit: string, sort_order: number, type: ComponentProductType = "color"): ServiceComponent {
  return {
    product_type: type,
    product_amount: 2,
    product_unit: defaultUnit,
    developer_amount: 2 * DEFAULT_RATIO[type],
    developer_unit: defaultUnit,
    developer_ratio: DEFAULT_RATIO[type],
    sort_order,
  };
}

function ComponentRow({
  value,
  onChange,
  onRemove,
  canRemove,
}: {
  value: ServiceComponent;
  onChange: (next: ServiceComponent) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const setField = <K extends keyof ServiceComponent>(k: K, v: ServiceComponent[K]) =>
    onChange({ ...value, [k]: v });

  const handleAmount = (v: string) => {
    const amt = parseFloat(v) || 0;
    const ratio = value.developer_ratio ?? DEFAULT_RATIO[value.product_type];
    onChange({
      ...value,
      product_amount: amt,
      developer_amount: parseFloat((amt * ratio).toFixed(2)),
    });
  };

  const handleRatio = (v: string) => {
    const ratio = parseFloat(v) || 0;
    onChange({
      ...value,
      developer_ratio: ratio,
      developer_amount: parseFloat((value.product_amount * ratio).toFixed(2)),
    });
  };

  const handleDevAmount = (v: string) => {
    // Manual override: keep ratio for future edits but store the typed amount.
    setField("developer_amount", parseFloat(v) || 0);
  };

  return (
    <div className="rounded-lg border border-border/60 bg-secondary/30 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <Select
          value={value.product_type}
          onValueChange={(t) => {
            const type = t as ComponentProductType;
            const ratio = DEFAULT_RATIO[type];
            onChange({
              ...value,
              product_type: type,
              developer_ratio: ratio,
              developer_amount: parseFloat((value.product_amount * ratio).toFixed(2)),
            });
          }}
        >
          <SelectTrigger className="w-40 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="color">Color</SelectItem>
            <SelectItem value="lightener">Lightener</SelectItem>
            <SelectItem value="toner">Toner</SelectItem>
          </SelectContent>
        </Select>
        {canRemove && (
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={onRemove}>
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label className="text-xs text-muted-foreground">Product amount</Label>
          <div className="flex gap-1 mt-1">
            <Input
              type="number" step="0.1" min="0"
              value={value.product_amount || ""}
              onChange={(e) => handleAmount(e.target.value)}
              className="flex-1 h-8"
            />
            <Select value={value.product_unit} onValueChange={(u) => setField("product_unit", u)}>
              <SelectTrigger className="w-16 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="oz">oz</SelectItem>
                <SelectItem value="g">g</SelectItem>
                <SelectItem value="ml">ml</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Ratio 1 :</Label>
          <Input
            type="number" step="0.1" min="0"
            value={value.developer_ratio ?? ""}
            onChange={(e) => handleRatio(e.target.value)}
            className="h-8 mt-1"
            placeholder="2"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Developer</Label>
          <div className="flex gap-1 mt-1">
            <Input
              type="number" step="0.1" min="0"
              value={value.developer_amount || ""}
              onChange={(e) => handleDevAmount(e.target.value)}
              className="flex-1 h-8"
            />
            <Select value={value.developer_unit} onValueChange={(u) => setField("developer_unit", u)}>
              <SelectTrigger className="w-16 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="oz">oz</SelectItem>
                <SelectItem value="g">g</SelectItem>
                <SelectItem value="ml">ml</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}

function ServiceFormDialog({
  onSubmit,
  initialData,
  trigger,
  isPending,
  defaultUnit = "oz",
}: {
  onSubmit: (data: ServiceFormData) => void;
  initialData?: ServiceFormData;
  trigger: React.ReactNode;
  isPending: boolean;
  defaultUnit?: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialData?.name || "");
  const [price, setPrice] = useState(initialData?.price?.toString() || "");
  const [components, setComponents] = useState<ServiceComponent[]>(
    initialData?.components?.length ? initialData.components : [newComponent(defaultUnit, 0)]
  );

  const resetForm = () => {
    setName(initialData?.name || "");
    setPrice(initialData?.price?.toString() || "");
    setComponents(initialData?.components?.length ? initialData.components : [newComponent(defaultUnit, 0)]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      price: parseFloat(price) || 0,
      components: components.map((c, i) => ({ ...c, sort_order: i })),
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) resetForm(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Service" : "Add Service"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="svc-name">Service Name</Label>
            <Input id="svc-name" placeholder="e.g. All Over Color" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="svc-price">Client Charge Price ($)</Label>
            <Input id="svc-price" type="number" step="0.01" min="0" placeholder="85.00" value={price} onChange={(e) => setPrice(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Product Allotments</Label>
              <Button
                type="button" size="sm" variant="ghost" className="h-7"
                onClick={() => setComponents((prev) => [...prev, newComponent(defaultUnit, prev.length)])}
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add component
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Add a row per product used in this service (e.g. lightener + color for a full head blond).
            </p>
            <div className="space-y-2">
              {components.map((c, i) => (
                <ComponentRow
                  key={i}
                  value={c}
                  onChange={(next) => setComponents((prev) => prev.map((x, idx) => (idx === i ? next : x)))}
                  onRemove={() => setComponents((prev) => prev.filter((_, idx) => idx !== i))}
                  canRemove={components.length > 1}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isPending || !name || !price}>
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {initialData ? "Save" : "Add Service"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface LineDeveloperDefault {
  brand: string;
  line: string;
  developer_brand: string;
  developer_line: string;
}

function computeDevCostMaps(products: ReturnType<typeof useProducts>["products"]) {
  // Only priced developers count. A $0 product is a data-entry gap and would
  // otherwise poison the salon-wide average with tiny fractional cents.
  const developerProducts = products.filter(
    (p) => p.isActive && p.type.toLowerCase() === "developer" && p.cost > 0
  );
  const devLineTotals = new Map<string, { totalCost: number; totalSize: number }>();
  let salonTotalDevCost = 0;
  let salonTotalDevSize = 0;
  for (const d of developerProducts) {
    const sizeMl = toMl(d.size, d.sizeUnit);
    salonTotalDevCost += d.cost;
    salonTotalDevSize += sizeMl;
    if (!d.brand || !d.line) continue;
    const key = `${d.brand}|||${d.line}`;
    const existing = devLineTotals.get(key);
    if (existing) {
      existing.totalCost += d.cost;
      existing.totalSize += sizeMl;
    } else {
      devLineTotals.set(key, { totalCost: d.cost, totalSize: sizeMl });
    }
  }
  const devLineCostPerMl = new Map<string, number>();
  for (const [k, v] of devLineTotals) {
    if (v.totalSize > 0 && v.totalCost > 0) devLineCostPerMl.set(k, v.totalCost / v.totalSize);
  }
  const salonAvgDevCostPerMl = salonTotalDevSize > 0 ? salonTotalDevCost / salonTotalDevSize : 0;
  return {
    devLineCostPerMl,
    salonAvgDevCostPerMl,
    hasPricedDevelopers: developerProducts.length > 0 && salonAvgDevCostPerMl > 0,
  };
}

function computeComponentCosts(
  component: ServiceComponent,
  products: ReturnType<typeof useProducts>["products"],
  developerDefaults: LineDeveloperDefault[],
  devLineCostPerMl: Map<string, number>,
  salonAvgDevCostPerMl: number,
  hasPricedDevelopers: boolean,
): CostBreakdown[] {
  const typesToInclude: string[] =
    component.product_type === "lightener"
      ? ["lightener"]
      : ["color", "toner"];

  const active = products.filter((p) => p.isActive);
  // Only priced products count — a $0 product is a data-entry gap and would
  // silently drag the line's average cost down (same rule as developers).
  const relevant = active.filter(
    (p) => typesToInclude.includes(p.type.toLowerCase()) && p.cost > 0,
  );

  const grouped = new Map<string, {
    totalCost: number; totalSize: number; brand: string; line: string; productType: ComponentProductType;
  }>();
  for (const p of relevant) {
    if (!p.brand || !p.line) continue;
    const key = `${p.brand}|||${p.line}`;
    const sizeMl = toMl(p.size, p.sizeUnit);
    const t = p.type.toLowerCase() as ComponentProductType;
    const existing = grouped.get(key);
    if (existing) {
      existing.totalCost += p.cost;
      existing.totalSize += sizeMl;
    } else {
      grouped.set(key, { totalCost: p.cost, totalSize: sizeMl, brand: p.brand, line: p.line, productType: t });
    }
  }

  const preferredDev = new Map<string, { brand: string; line: string }>();
  for (const d of developerDefaults) {
    preferredDev.set(`${d.brand}|||${d.line}`, { brand: d.developer_brand, line: d.developer_line });
  }

  const productMl = toMl(component.product_amount, component.product_unit);
  const devMl = toMl(component.developer_amount, component.developer_unit);

  const results: CostBreakdown[] = [];
  for (const [key, lineData] of grouped) {
    const avgPerMl = lineData.totalSize > 0 ? lineData.totalCost / lineData.totalSize : 0;
    const colorCost = avgPerMl * productMl;

    const preferred = preferredDev.get(key);
    let devCostPerMl: number | null = hasPricedDevelopers ? salonAvgDevCostPerMl : null;
    let developerLabel = "Avg of your priced developers";
    let developerUsingFallback = true;

    if (preferred) {
      const devKey = `${preferred.brand}|||${preferred.line}`;
      const perMl = devLineCostPerMl.get(devKey);
      if (perMl !== undefined && perMl > 0) {
        devCostPerMl = perMl;
        developerLabel = `${preferred.brand} ${preferred.line}`.trim();
        developerUsingFallback = false;
      } else if (hasPricedDevelopers) {
        developerLabel = `${preferred.brand} ${preferred.line} — no cost set · using avg`.trim();
      } else {
        developerLabel = `${preferred.brand} ${preferred.line} — no cost set`.trim();
      }
    }

    const developerMissing = devCostPerMl == null;
    const developerCost = devCostPerMl == null ? null : devCostPerMl * devMl;

    results.push({
      brandLine: `${lineData.brand} ${lineData.line}`.trim(),
      brand: lineData.brand,
      line: lineData.line,
      productType: lineData.productType,
      colorCost,
      developerCost,
      totalProductCost: colorCost + (developerCost ?? 0),
      developerLabel,
      developerUsingFallback,
      developerMissing,
    });
  }

  return results.sort((a, b) => a.brandLine.localeCompare(b.brandLine));
}


function ComponentBreakdown({
  component,
  products,
  developerDefaults,
  devLineCostPerMl,
  salonAvgDevCostPerMl,
  hasPricedDevelopers,
}: {
  component: ServiceComponent;
  products: ReturnType<typeof useProducts>["products"];
  developerDefaults: LineDeveloperDefault[];
  devLineCostPerMl: Map<string, number>;
  salonAvgDevCostPerMl: number;
  hasPricedDevelopers: boolean;
}) {
  const rows = useMemo<CostBreakdown[]>(
    () =>
      computeComponentCosts(
        component,
        products,
        developerDefaults,
        devLineCostPerMl,
        salonAvgDevCostPerMl,
        hasPricedDevelopers,
      ),
    [component, products, developerDefaults, devLineCostPerMl, salonAvgDevCostPerMl, hasPricedDevelopers],
  );

  // Flag developer products whose size unit looks mis-entered (e.g. 3785 "oz"
  // is ~30 gallons — almost always meant to be ml). Purely informational.
  const suspiciousDev = useMemo(
    () =>
      products.filter(
        (p) =>
          p.isActive &&
          p.type.toLowerCase() === "developer" &&
          p.sizeUnit === "oz" &&
          p.size > 200,
      ),
    [products],
  );

  if (rows.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        No matching {TYPE_LABEL[component.product_type].toLowerCase()} products in inventory yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.brandLine} className="rounded-lg bg-secondary/50 p-3 space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground text-sm">{r.brandLine}</span>
              <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                {TYPE_LABEL[r.productType]}
              </span>
            </div>
            <span className="text-sm font-medium">${r.totalProductCost.toFixed(2)}</span>
          </div>
          <div className="space-y-0.5 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>{TYPE_LABEL[r.productType]} Cost</span>
              <span>${r.colorCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>
                Developer Cost
                <span className={`ml-1 ${r.developerUsingFallback ? "italic opacity-70" : "opacity-70"}`}>
                  ({r.developerLabel})
                </span>
              </span>
              <span>{r.developerCost == null ? "—" : `$${r.developerCost.toFixed(2)}`}</span>
            </div>
            {r.developerMissing && (
              <p className="text-[11px] text-muted-foreground/80 italic pt-0.5">
                Set a cost on at least one developer in Inventory to see this.
              </p>
            )}
          </div>
        </div>
      ))}
      {suspiciousDev.length > 0 && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400">
          Heads up: {suspiciousDev.map((p) => `${p.brand} ${p.line} ${p.name}`).join(", ")}{" "}
          {suspiciousDev.length === 1 ? "has" : "have"} size stored as "oz" with a very large number.
          If you actually buy them by the gallon, switch the unit to "gal" in Inventory (or "L" for liter) so the cost math is accurate.

        </p>
      )}
    </div>
  );
}


function CostBreakdownSection({
  service,
  products,
  settings,
  displayUnit,
}: {
  service: { price: number; components: ServiceComponent[] };
  products: ReturnType<typeof useProducts>["products"];
  settings: { markup_percent: number; waste_factor_percent: number; bowl_fee: number; rounding_amount: number; backbar_multiplier?: number } | null;
  displayUnit: string;
}) {
  const { data: developerDefaults = [] } = useQuery({
    queryKey: ["line-developer-defaults"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("line_developer_defaults" as any)
        .select("brand, line, developer_brand, developer_line");
      if (error) throw error;
      return data as unknown as LineDeveloperDefault[];
    },
  });

  const { devLineCostPerMl, salonAvgDevCostPerMl, hasPricedDevelopers } = useMemo(
    () => computeDevCostMaps(products),
    [products],
  );

  if (!settings) return null;
  if (!service.components.length) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Add at least one product allotment to this service.
      </p>
    );
  }

  // Service-level totals: sum each component's cheapest and priciest line
  const costRange = (() => {
    let lo = 0;
    let hi = 0;
    let any = false;
    for (const c of service.components) {
      const rows = computeComponentCosts(
        c, products, developerDefaults, devLineCostPerMl, salonAvgDevCostPerMl, hasPricedDevelopers,
      );
      if (rows.length === 0) continue;
      any = true;
      const totals = rows.map((r) => r.totalProductCost);
      lo += Math.min(...totals);
      hi += Math.max(...totals);
    }
    return any ? { lo, hi } : null;
  })();

  const unpricedCount = products.filter(
    (p) => p.isActive && p.cost <= 0 &&
      ["color", "toner", "lightener", "developer"].includes(p.type.toLowerCase()),
  ).length;

  const price = Number(service.price) || 0;
  const pctHi = price > 0 && costRange ? (costRange.hi / price) * 100 : null;

  return (
    <div className="space-y-4">
      {costRange && (
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <p className="text-sm text-foreground">
            Product cost at your prices:{" "}
            <span className="font-semibold">
              ${costRange.lo.toFixed(2)}
              {costRange.hi - costRange.lo > 0.005 ? ` – $${costRange.hi.toFixed(2)}` : ""}
            </span>
            {pctHi !== null && (
              <>
                {" "}·{" "}
                <span
                  className={
                    pctHi <= 15 ? "text-success font-semibold"
                    : pctHi <= 30 ? "text-warning font-semibold"
                    : "text-destructive font-semibold"
                  }
                >
                  up to {pctHi.toFixed(0)}% of your ${price.toFixed(2)} price
                </span>
              </>
            )}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            The range covers your cheapest to priciest color line. Most salons aim to keep product under ~15% of the service price.
          </p>
          {unpricedCount > 0 && (
            <p className="text-xs text-warning mt-1">
              {unpricedCount} product{unpricedCount === 1 ? " has" : "s have"} no price set and {unpricedCount === 1 ? "is" : "are"} excluded — set prices in Inventory for accurate estimates.
            </p>
          )}
        </div>
      )}
      {service.components.map((c, i) => (
        <div key={i} className="space-y-2">
          <div className="flex items-baseline justify-between border-b border-border/40 pb-1">
            <h5 className="text-sm font-semibold text-foreground">
              {TYPE_LABEL[c.product_type]}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {convertAmount(c.product_amount, c.product_unit, displayUnit).toFixed(1)} {displayUnit} product
                {" + "}
                {convertAmount(c.developer_amount, c.developer_unit, displayUnit).toFixed(1)} {displayUnit} developer
              </span>
            </h5>
          </div>
          <ComponentBreakdown
            component={c}
            products={products}
            developerDefaults={developerDefaults}
            devLineCostPerMl={devLineCostPerMl}
            salonAvgDevCostPerMl={salonAvgDevCostPerMl}
            hasPricedDevelopers={hasPricedDevelopers}
          />
        </div>
      ))}
    </div>
  );
}


function summarizeComponents(components: ServiceComponent[], displayUnit: string): string {
  if (!components.length) return "No allotments configured";
  return components
    .map((c) => {
      const p = convertAmount(c.product_amount, c.product_unit, displayUnit).toFixed(1);
      const d = convertAmount(c.developer_amount, c.developer_unit, displayUnit).toFixed(1);
      return `${TYPE_LABEL[c.product_type]} ${p}${displayUnit} + ${d}${displayUnit} developer`;
    })
    .join("  ·  ");
}

export function ServiceMenuCard() {
  const { services, isLoading, createService, updateService, deleteService } = useServiceMenu();
  const { products } = useProducts();
  const { settings } = useSalonSettings();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const displayUnit = settings?.preferred_display_unit || "oz";

  const { data: developerDefaults = [] } = useQuery({
    queryKey: ["line-developer-defaults"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("line_developer_defaults" as any)
        .select("brand, line, developer_brand, developer_line");
      if (error) throw error;
      return data as unknown as LineDeveloperDefault[];
    },
  });

  const { devLineCostPerMl, salonAvgDevCostPerMl, hasPricedDevelopers } = useMemo(
    () => computeDevCostMaps(products),
    [products],
  );

  const avgCostByServiceId = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const svc of services) {
      if (!svc.components.length) {
        map.set(svc.id, null);
        continue;
      }
      let total = 0;
      let anyMissing = false;
      for (const c of svc.components) {
        const rows = computeComponentCosts(
          c,
          products,
          developerDefaults,
          devLineCostPerMl,
          salonAvgDevCostPerMl,
          hasPricedDevelopers,
        );
        if (rows.length === 0 || rows.some((r) => r.developerMissing)) {
          anyMissing = true;
          break;
        }
        const avg = rows.reduce((s, r) => s + r.totalProductCost, 0) / rows.length;
        total += avg;
      }
      map.set(svc.id, anyMissing ? null : total);
    }
    return map;
  }, [services, products, developerDefaults, devLineCostPerMl, salonAvgDevCostPerMl, hasPricedDevelopers]);



  if (isLoading) {
    return (
      <motion.div
        className="stat-card flex items-center justify-center h-64"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      >
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Service Menu</h3>
          <p className="text-sm text-muted-foreground">
            Define your services and see real-time cost breakdowns by product line.
          </p>
          <p className="text-xs text-muted-foreground/80 mt-0.5">
            Costs update live from Inventory — edit a product price there and it flows here instantly.
          </p>
        </div>

        <ServiceFormDialog
          onSubmit={(data) => createService.mutate(data)}
          isPending={createService.isPending}
          defaultUnit={displayUnit}
          trigger={
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add Service
            </Button>
          }
        />
      </div>

      {services.length === 0 ? (
        <motion.div
          className="stat-card flex flex-col items-center justify-center py-12"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        >
          <Scissors className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No services yet. Add your first service to get started.</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {services.map((service, i) => (
              <motion.div
                key={service.id}
                className="stat-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1 pr-3">
                    <h4 className="font-semibold text-foreground">{service.name}</h4>
                    <p className="text-sm text-muted-foreground truncate">
                      {summarizeComponents(service.components, displayUnit)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-lg font-semibold text-foreground">${Number(service.price).toFixed(2)}</span>
                    <ServiceFormDialog
                      initialData={{
                        name: service.name,
                        price: Number(service.price),
                        components: service.components.length
                          ? service.components
                          : [newComponent(displayUnit, 0)],
                      }}
                      onSubmit={(data) => updateService.mutate({ id: service.id, formData: data })}
                      isPending={updateService.isPending}
                      defaultUnit={displayUnit}
                      trigger={
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      }
                    />
                    <Button
                      size="icon" variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deleteService.mutate(service.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {(() => {
                  const avg = avgCostByServiceId.get(service.id);
                  return (
                    <div className="mt-2 flex items-center gap-1.5 text-sm">
                      <span className="text-muted-foreground">Avg product cost:</span>
                      <span className="font-medium text-foreground tabular-nums">
                        {avg == null ? "—" : `$${avg.toFixed(2)}`}
                      </span>
                    </div>
                  );
                })()}

                <button
                  onClick={() => setExpandedId(expandedId === service.id ? null : service.id)}
                  className="flex items-center gap-1.5 mt-3 text-sm text-primary hover:underline"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  Cost Breakdown
                  {expandedId === service.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>


                <AnimatePresence>
                  {expandedId === service.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-3">
                        <CostBreakdownSection
                          service={{
                            price: Number(service.price),
                            components: service.components,
                          }}
                          products={products}
                          settings={settings}
                          displayUnit={displayUnit}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
