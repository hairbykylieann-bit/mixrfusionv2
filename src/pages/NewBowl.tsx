import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, DollarSign, CheckCircle2, Home, ChevronLeft, ChevronRight, User, Scissors as ScissorsIcon, FlaskConical, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Header } from "@/components/layout/Header";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Product } from "@/components/bowl/ProductCombobox";
import { ClientSearchPanel } from "@/components/bowl/ClientSearchPanel";
import { AddClientDialog } from "@/components/clients/AddClientDialog";
import { BowlCard, Bowl, Remix, storeRatio } from "@/components/bowl/BowlCard";
import { SessionNotesCard } from "@/components/bowl/SessionNotesCard";
import { MariaAssistant, generateMariaSuggestion } from "@/components/maria/MariaAssistant";
import { MiraVoiceInput } from "@/components/mira/MiraVoiceInput";
import { type MiraParseResult } from "@/hooks/useMira";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Atomic stock adjustment — avoids stale-cache race conditions
const adjustStock = async (productId: string, delta: number) => {
  const roundedDelta = Math.round(delta * 100) / 100;
  if (roundedDelta === 0) return;
  await supabase.rpc('adjust_product_stock', {
    p_product_id: productId,
    p_delta: roundedDelta,
  });
};
import { useSalonSettings, SalonSettings } from "@/hooks/useSalonSettings";
import { calculateServiceCharge } from "@/lib/utils";
import { useClients } from "@/hooks/useClients";
import { useClientDetail } from "@/hooks/useClientDetail";
import type { FormulaRecord } from "@/hooks/useClients";
import { useEffectiveStaff } from "@/hooks/useEffectiveStaff";
import { useTenant } from "@/contexts/TenantContext";
import { useServiceMenu, ServiceMenuItem } from "@/hooks/useServiceMenu";
import { useSalonBowls } from "@/hooks/useSalonBowls";
import {
  Select as ServiceSelect,
  SelectContent as ServiceSelectContent,
  SelectItem as ServiceSelectItem,
  SelectTrigger as ServiceSelectTrigger,
  SelectValue as ServiceSelectValue,
} from "@/components/ui/select";
import { Scissors } from "lucide-react";

import { convertToGrams, convertAmountBetweenUnits } from "@/lib/units";

const createNewBowl = (index: number, defaultUnit: string = "g"): Bowl => ({
  id: Date.now(),
  name: `Bowl ${index}`,
  mixItems: [{ id: Date.now(), productType: "Color", product: "", amount: "", unit: defaultUnit }],
  developers: [{ id: Date.now() + 1, product: "", amount: "", unit: defaultUnit }],
  notes: "",
  leftoverUnit: defaultUnit,
});

// ─── Charge the Client Summary ───────────────────────────────────────────────
function ChargeSummary({
  bowls,
  colorProducts,
  developerProducts,
  settings,
  selectedService,
  staffMarkup,
  staffBowlFee,
}: {
  bowls: Bowl[];
  colorProducts: Product[];
  developerProducts: Product[];
  settings: SalonSettings | null | undefined;
  selectedService: ServiceMenuItem | null;
  staffMarkup?: { has_custom_markup: boolean; custom_markup_percent: number } | null;
  staffBowlFee?: { has_custom_bowl_fee: boolean; custom_bowl_fee: number } | null;
}) {
  const summary = useMemo(() => {
    if (!settings) return null;

    // Flatten parent bowls + their remixes so totals include every formula version
    const allFormulas: { mixItems: Bowl['mixItems']; developers: Bowl['developers'] }[] = [];
    for (const b of bowls) {
      allFormulas.push({ mixItems: b.mixItems, developers: b.developers });
      for (const r of b.remixes ?? []) {
        allFormulas.push({ mixItems: r.mixItems, developers: r.developers });
      }
    }

    // Need either a selected service OR at least one product with amount to show charge
    const hasProduct = allFormulas.some(f =>
      f.mixItems.some(i => i.product && i.amount && parseFloat(i.amount) > 0) ||
      f.developers.some(d => d.product && d.amount && parseFloat(d.amount) > 0)
    );
    if (!selectedService && !hasProduct) return null;

    const backbarMultiplier = (staffMarkup?.has_custom_markup && staffMarkup.custom_markup_percent > 0)
      ? staffMarkup.custom_markup_percent
      : (settings.backbar_multiplier ?? 4);
    const effectiveBowlFee = (staffBowlFee?.has_custom_bowl_fee)
      ? staffBowlFee.custom_bowl_fee
      : (settings.bowl_fee || 0);
    // Bowl fee is per parent bowl (a remix doesn't add a new bowl charge)
    const bowlFeeTotal = bowls.length * effectiveBowlFee;

    // Calculate total product cost across all bowls AND remixes
    let totalColorCost = 0;
    let totalDevCost = 0;

    for (const f of allFormulas) {
      for (const item of f.mixItems) {
        if (!item.product || !item.amount) continue;
        const product = colorProducts.find(p => p.id === item.product);
        if (!product?.cost || !product?.size) continue;
        const bottleG = convertToGrams(product.size, product.sizeUnit || 'ml');
        const costPerG = product.cost / bottleG;
        totalColorCost += costPerG * convertToGrams(parseFloat(item.amount), item.unit);
      }
      for (const dev of f.developers) {
        if (!dev.product || !dev.amount) continue;
        const devProd = developerProducts.find(p => p.id === dev.product);
        if (!devProd?.cost || !devProd?.size) continue;
        const bottleG = convertToGrams(devProd.size, devProd.sizeUnit || 'ml');
        const costPerG = devProd.cost / bottleG;
        totalDevCost += costPerG * convertToGrams(parseFloat(dev.amount), dev.unit);
      }
    }

    const totalProductCost = totalColorCost + totalDevCost;

    if (selectedService) {
      // Sum usage across all bowls in service units
      const sColorUnit = selectedService.color_unit || 'oz';
      const sDevUnit = selectedService.developer_unit || 'oz';
      let totalColorUsage = 0;
      let totalDevUsage = 0;

      for (const f of allFormulas) {
        for (const item of f.mixItems) {
          if (!item.product || !item.amount) continue;
          totalColorUsage += convertAmountBetweenUnits(parseFloat(item.amount), item.unit, sColorUnit);
        }
        for (const dev of f.developers) {
          if (!dev.product || !dev.amount) continue;
          totalDevUsage += convertAmountBetweenUnits(parseFloat(dev.amount), dev.unit, sDevUnit);
        }
      }

      const colorOverage = Math.max(0, totalColorUsage - selectedService.color_amount);
      const devOverage = Math.max(0, totalDevUsage - selectedService.developer_amount);
      const withinAllotment = colorOverage === 0 && devOverage === 0;

      // Calculate overage cost proportionally
      const colorAllotmentRatio = selectedService.color_amount > 0 && totalColorUsage > 0
        ? Math.min(1, selectedService.color_amount / totalColorUsage) : 0;
      const devAllotmentRatio = selectedService.developer_amount > 0 && totalDevUsage > 0
        ? Math.min(1, selectedService.developer_amount / totalDevUsage) : 0;

      const overageCost = totalColorCost * Math.max(0, 1 - colorAllotmentRatio)
        + totalDevCost * Math.max(0, 1 - devAllotmentRatio);

      const overageCharge = overageCost > 0
        ? calculateServiceCharge(overageCost, backbarMultiplier, settings.waste_factor_percent, 0, settings.rounding_amount)
        : 0;

      const total = selectedService.price + overageCharge + bowlFeeTotal;

      // Build overage description
      let overageDesc = '';
      if (colorOverage > 0) overageDesc += `+${colorOverage.toFixed(1)}${sColorUnit} color`;
      if (devOverage > 0) overageDesc += (overageDesc ? ', ' : '') + `+${devOverage.toFixed(1)}${sDevUnit} developer`;

      return { type: 'service' as const, serviceName: selectedService.name, servicePrice: selectedService.price, withinAllotment, overageCharge, overageDesc, bowlFeeTotal, bowlCount: bowls.length, perBowlFee: effectiveBowlFee, total };
    }

    // No service: charge all product
    const productCharge = calculateServiceCharge(totalProductCost, backbarMultiplier, settings.waste_factor_percent, 0, settings.rounding_amount);
    const total = productCharge + bowlFeeTotal;

    return { type: 'no-service' as const, productCharge, backbarMultiplier, bowlFeeTotal, bowlCount: bowls.length, perBowlFee: effectiveBowlFee, total };
  }, [bowls, colorProducts, developerProducts, settings, selectedService, staffMarkup, staffBowlFee]);

  if (!summary) return null;

  const fmt = (n: number) => `$${n.toFixed(2)}`;

  return (
    <motion.div
      className="stat-card mt-6 border-primary/30"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }}
    >
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Charge the Client</h3>
      </div>

      <div className="space-y-2 text-sm">
        {summary.type === 'service' ? (
          <>
            <div className="flex justify-between">
              <span className="text-foreground">{summary.serviceName} Service</span>
              <span className="font-medium text-foreground">{fmt(summary.servicePrice)}</span>
            </div>
            {summary.withinAllotment ? (
              <div className="flex justify-between text-muted-foreground">
                <span>Product: within allotment</span>
                <span>—</span>
              </div>
            ) : (
              <div className="flex justify-between">
                <span className="text-foreground">Product Overage <span className="text-muted-foreground text-xs">({summary.overageDesc})</span></span>
                <span className="font-medium text-foreground">+{fmt(summary.overageCharge)}</span>
              </div>
            )}
            {summary.bowlFeeTotal > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Bowl Fees ({summary.bowlCount} bowl{summary.bowlCount !== 1 ? 's' : ''} × {fmt(summary.perBowlFee)})</span>
                <span>+{fmt(summary.bowlFeeTotal)}</span>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex justify-between">
              <span className="text-foreground">Product Charge <span className="text-muted-foreground text-xs">({summary.backbarMultiplier}× markup)</span></span>
              <span className="font-medium text-foreground">{fmt(summary.productCharge)}</span>
            </div>
            {summary.bowlFeeTotal > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Bowl Fees ({summary.bowlCount} bowl{summary.bowlCount !== 1 ? 's' : ''} × {fmt(summary.perBowlFee)})</span>
                <span>+{fmt(summary.bowlFeeTotal)}</span>
              </div>
            )}
          </>
        )}

        {/* Total */}
        <div className="pt-3 mt-3 border-t border-border flex justify-between items-center">
          <span className="text-sm font-semibold uppercase tracking-wide text-success">Total</span>
          <span className="text-2xl font-bold text-success">{fmt(summary.total)}</span>
        </div>
      </div>
    </motion.div>
  );
}

export default function NewBowl() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [bowls, setBowls] = useState<Bowl[]>(() => [createNewBowl(1)]);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [showAddClient, setShowAddClient] = useState(false);
  const [prefillClientName, setPrefillClientName] = useState("");
  const [isLogging, setIsLogging] = useState(false);
  const [existingSessionId, setExistingSessionId] = useState<string | null>(null);
  const [existingBowlCount, setExistingBowlCount] = useState(0);
  const [existingBowlDbIds, setExistingBowlDbIds] = useState<string[]>([]);
  const [originalBowlSnapshots, setOriginalBowlSnapshots] = useState<Map<number, { dbBowlId: string; mixItems: { productId: string; amount: string; unit: string }[]; developers: { product: string; amount: string; unit: string }[]; notes: string }>>(new Map());
  const [deletedExistingBowlIds, setDeletedExistingBowlIds] = useState<string[]>([]);
  const [sessionSaved, setSessionSaved] = useState(false);
  const [sessionCanvas, setSessionCanvas] = useState<import("@/components/bowl/SessionCanvasModal").CanvasData | null>(null);
  const [sessionCanvasPreviewUrl, setSessionCanvasPreviewUrl] = useState<string | null>(null);
  const [step, setStep] = useState<'client' | 'service' | 'bowls'>(() => {
    const s = (location.state as any) || {};
    if (s.existingSessionId || s.formula) return 'bowls';
    if (s.client) return 'service';
    return 'client';
  });
  const [mariaSuggestion, setMariaSuggestion] = useState<{
    id: string;
    message: string;
    type: "waste" | "suggestion" | "reminder";
  } | null>(null);

  const { settings } = useSalonSettings();
  const preferredUnit = settings?.preferred_display_unit || "oz";
  const { clients, isLoading: clientsLoading, createClient } = useClients();
  const { effectiveStaff, isLoading: staffLoading } = useEffectiveStaff();
  const { tenantId } = useTenant();
  const { services } = useServiceMenu();
  const { bowls: salonBowlPresets } = useSalonBowls();

  const selectedService = useMemo(() => {
    if (!selectedServiceId) return null;
    return services.find(s => s.id === selectedServiceId) || null;
  }, [selectedServiceId, services]);
  
  // Determine the effective backbar multiplier for this staff member
  const effectiveBackbarMultiplier = effectiveStaff?.markup.has_custom_markup 
    ? effectiveStaff.markup.custom_markup_percent 
    : (settings?.backbar_multiplier ?? 4);

  // Fetch products from database
  const { data: dbProducts } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('brand', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch developer line defaults
  const { data: developerDefaults } = useQuery({
    queryKey: ['line-developer-defaults'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('line_developer_defaults' as any)
        .select('*');
      if (error) throw error;
      return data as any as Array<{
        brand: string;
        line: string;
        developer_brand: string;
        developer_line: string;
      }>;
    },
  });

  // Build lookup map for developer defaults
  const developerDefaultsMap = useMemo(() => {
    const map = new Map<string, { brand: string; line: string }>();
    developerDefaults?.forEach((d) => {
      map.set(`${d.brand}|${d.line}`, { brand: d.developer_brand, line: d.developer_line });
    });
    return map;
  }, [developerDefaults]);

  // Transform database products to match Product interface
  const { colorProducts, developerProducts } = useMemo(() => {
    if (!dbProducts) return { colorProducts: [], developerProducts: [] };
    
    const mapProduct = (p: typeof dbProducts[0]): Product => ({
      id: p.id,
      shadeCode: p.shade || '',
      name: p.name,
      brand: p.brand,
      productLine: p.line || p.type,
      type: p.type,
      status: p.stock <= 0 ? 'out' : p.stock <= p.reorder_level ? 'low' : 'in-stock',
      cost: (Number(p.cost_per_unit) || 0) * (Number(p.size) || 1),
      size: Number(p.size) || 60,
      sizeUnit: p.size_unit || 'ml',
    });

    return {
      colorProducts: dbProducts.filter(p => p.type === 'Color' || p.type === 'Lightener' || p.type === 'Treatment').map(mapProduct),
      developerProducts: dbProducts.filter(p => p.type === 'Developer').map(mapProduct),
    };
  }, [dbProducts]);

  // Determine preferred developer line for each bowl based on first color product
  const getPreferredDeveloperLine = useCallback((bowl: Bowl): { brand: string; line: string } | null => {
    for (const item of bowl.mixItems) {
      if (!item.product) continue;
      const product = colorProducts.find(p => p.id === item.product);
      if (product) {
        const key = `${product.brand}|${product.productLine}`;
        const pref = developerDefaultsMap.get(key);
        if (pref) return pref;
      }
    }
    return null;
  }, [colorProducts, developerDefaultsMap]);

  const hasPopulatedFormula = useRef(false);

  // Handle pre-filled data from client page
  useEffect(() => {
    const state = location.state as { 
      client?: { id: string; name: string }; 
      formula?: any;
      isOptimized?: boolean;
      existingSessionId?: string;
      existingServiceId?: string;
    } | null;
    
    if (state?.client) {
      setSelectedClient(state.client.id);
    }

    if (state?.existingSessionId) {
      setExistingSessionId(state.existingSessionId);
    }

    if (state?.existingServiceId) {
      setSelectedServiceId(state.existingServiceId);
    }

    if (state?.formula) {
      console.log("Loaded formula from navigation state:", state.formula);
      console.log("Available color products:", colorProducts.length);
      console.log("Available developer products:", developerProducts.length);
    }
    
    // Pre-fill bowls with formula data (only once and when products are loaded)
    if (state?.formula && !hasPopulatedFormula.current && colorProducts.length > 0) {
      hasPopulatedFormula.current = true;
      
      const formula = state.formula;
      const mixItems: Bowl['mixItems'] = [];
      
      // Match formula components to products using productId first, then fallback to name matching
      if (formula.components && Array.isArray(formula.components)) {
        formula.components.forEach((comp: { productId?: string; productName: string; amount: number; unit?: string }, idx: number) => {
          // Try direct ID lookup first
          let matchingProduct = comp.productId 
            ? colorProducts.find(p => p.id === comp.productId)
            : undefined;
          
          // Fallback to name matching if ID not found
          if (!matchingProduct) {
            const componentName = comp.productName.toLowerCase();
            matchingProduct = colorProducts.find(p => {
              const productName = p.name.toLowerCase();
              const productShade = p.shadeCode?.toLowerCase() || '';
              return (
                productName === componentName ||
                productShade === componentName ||
                productName.includes(componentName) ||
                componentName.includes(productName)
              );
            });
          }
          
          mixItems.push({
            id: Date.now() + idx,
            productType: matchingProduct?.type === "Lightener" ? "Lightener" : "Color",
            product: matchingProduct?.id || "",
            amount: String(comp.amount),
            unit: comp.unit || formula.unit || preferredUnit,
          });
        });
      }
      
      // If no components matched, add an empty item
      if (mixItems.length === 0) {
        mixItems.push({ id: Date.now(), productType: "Color", product: "", amount: "", unit: preferredUnit });
      }
      
      // Find matching developer using productId first, then fallback to name matching
      let developersData: Bowl['developers'] = [{ id: Date.now() + 1000, product: "", amount: "", unit: preferredUnit }];
      if (formula.developer) {
        // Try direct ID lookup first
        let devMatch = formula.developer.productId 
          ? developerProducts.find(p => p.id === formula.developer.productId)
          : undefined;
        
        // Fallback to name matching
        if (!devMatch && formula.developer.name) {
          const devName = formula.developer.name.toLowerCase();
          devMatch = developerProducts.find(p => {
            const productName = p.name.toLowerCase();
            const productShade = p.shadeCode?.toLowerCase() || '';
            return (
              productName === devName ||
              productShade === devName ||
              productName.includes(devName) ||
              devName.includes(productName)
            );
          });
        }
        
        developersData = [{
          id: Date.now() + 1000,
          product: devMatch?.id || "",
          amount: String(formula.developer.amount || ""),
          unit: formula.developer.unit || formula.unit || preferredUnit,
        }];
      }
      
      setBowls([{
        id: Date.now(),
        name: "Bowl 1",
        mixItems,
        developers: developersData,
        notes: formula.notes || "",
        leftoverUnit: preferredUnit, // salon default (stylist can still override per bowl)
      }]);
      
      // Show appropriate toast
      if (state.isOptimized) {
        toast.success(`Loaded optimized formula for ${state.client?.name}`);
      } else {
        toast.success(`Loaded previous formula for ${state.client?.name}`);
      }
    }
    
    // Show Maria suggestion based on previous session data
    if (state?.formula?.amountMixed && state?.formula?.amountUsed) {
      const suggestion = generateMariaSuggestion(
        state.client?.name || "this client",
        state.formula.amountMixed,
        state.formula.amountUsed
      );
      if (suggestion) {
        setMariaSuggestion(suggestion);
      }
    }
  }, [location.state, colorProducts, developerProducts]);

  // Sync initial bowls to preferred unit once settings load
  useEffect(() => {
    if (!preferredUnit || preferredUnit === 'g') return; // 'g' is the default, no sync needed
    setBowls(prev => prev.map(bowl => {
      // Only update bowls that haven't been manually edited (amounts are still empty)
      const hasContent = bowl.mixItems.some(i => i.amount && parseFloat(i.amount) > 0) ||
        bowl.developers.some(d => d.amount && parseFloat(d.amount) > 0);
      if (hasContent) return bowl;
      return {
        ...bowl,
        mixItems: bowl.mixItems.map(item => ({ ...item, unit: preferredUnit })),
        developers: bowl.developers.map(dev => ({ ...dev, unit: preferredUnit })),
        leftoverUnit: preferredUnit,
      };
    }));
  }, [preferredUnit]);

  // Fetch existing session bowls when continuing a session
  useEffect(() => {
    if (!existingSessionId || !dbProducts) return;
    
    const fetchExistingBowls = async () => {
      const { data: sessionRow } = await supabase
        .from('color_sessions')
        .select('canvas_data, canvas_preview_url')
        .eq('id', existingSessionId)
        .maybeSingle();
      if (sessionRow) {
        const sr = sessionRow as any;
        if (sr.canvas_data) setSessionCanvas(sr.canvas_data);
        if (sr.canvas_preview_url) setSessionCanvasPreviewUrl(sr.canvas_preview_url);
      }

      const { data: allSessionBowls } = await supabase
        .from('session_bowls')
        .select('id, name, developer_product_id, developer_amount, developer_unit, amount_mixed, amount_used, notes, bowl_preset_id, bowl_tare_weight, bowl_tare_unit, reweighed_amount, reweighed_unit, parent_bowl_id, remix_index')
        .eq('session_id', existingSessionId);

      if (!allSessionBowls?.length) return;

      // Split parents (no parent_bowl_id) from remix children
      const sessionBowls = allSessionBowls.filter((b: any) => !b.parent_bowl_id);
      const remixRows = allSessionBowls
        .filter((b: any) => b.parent_bowl_id)
        .sort((a: any, b: any) => (a.remix_index ?? 0) - (b.remix_index ?? 0));

      const allIds = allSessionBowls.map((b: any) => b.id);
      const { data: bowlItems } = await supabase
        .from('bowl_items')
        .select('bowl_id, product_id, amount, unit, item_type')
        .in('bowl_id', allIds);

      // Helper: turn a session_bowls row into mixItems + developers
      const buildFormulaFromRow = (sb: any, idx: number) => {
        const items = bowlItems?.filter(bi => bi.bowl_id === sb.id) || [];
        const colorItems = items.filter(bi => (bi as any).item_type !== 'developer');
        const devItems = items.filter(bi => (bi as any).item_type === 'developer');

        const mixItems = colorItems.map((item, i) => ({
          id: Date.now() + i + idx * 100,
          productType: (dbProducts.find(p => p.id === item.product_id)?.type === 'Lightener' ? 'Lightener' : 'Color') as string,
          product: item.product_id,
          amount: String(item.amount),
          unit: item.unit || 'g',
        }));

        let developers: Bowl['developers'];
        if (devItems.length > 0) {
          developers = devItems.map((item, i) => ({
            id: Date.now() + 500 + i + idx * 100,
            product: item.product_id,
            amount: String(item.amount),
            unit: item.unit || 'g',
          }));
        } else if (sb.developer_product_id) {
          developers = [{
            id: Date.now() + 500 + idx * 100,
            product: sb.developer_product_id || '',
            amount: sb.developer_amount ? String(sb.developer_amount) : '',
            unit: sb.developer_unit || 'g',
          }];
        } else {
          developers = [{ id: Date.now() + 500 + idx * 100, product: '', amount: '', unit: preferredUnit }];
        }
        return { mixItems, developers };
      };

      const loadedBowls: Bowl[] = sessionBowls.map((sb: any, idx: number) => {
        const { mixItems, developers } = buildFormulaFromRow(sb, idx);

        // Attach any remix children of this parent bowl
        const remixes: Remix[] = remixRows
          .filter((r: any) => r.parent_bowl_id === sb.id)
          .map((r: any, ri: number) => {
            const { mixItems: rMix, developers: rDev } = buildFormulaFromRow(r, 1000 + idx * 50 + ri);
            return {
              id: Date.now() + 5000 + idx * 100 + ri,
              mixItems: rMix.length > 0 ? rMix : [{ id: Date.now() + ri, productType: 'Color', product: '', amount: '', unit: preferredUnit }],
              developers: rDev,
              notes: r.notes || '',
              dbBowlId: r.id,
            };
          });

        return {
          id: Date.now() + idx,
          name: sb.name || `Bowl ${idx + 1}`,
          mixItems: mixItems.length > 0 ? mixItems : [{ id: Date.now(), productType: 'Color', product: '', amount: '', unit: preferredUnit }],
          developers,
          notes: sb.notes || '',
          leftoverUnit: preferredUnit,
          bowlPresetId: sb.bowl_preset_id || null,
          bowlTareWeight: sb.bowl_tare_weight != null ? Number(sb.bowl_tare_weight) : null,
          bowlTareUnit: sb.bowl_tare_unit || null,
          reweighedAmount: sb.reweighed_amount != null ? String(sb.reweighed_amount) : undefined,
          reweighedUnit: sb.reweighed_unit || undefined,
          remixes: remixes.length > 0 ? remixes : undefined,
        };
      });


      // Store DB bowl IDs and snapshots for change detection
      const dbIds = sessionBowls.map(sb => sb.id);
      setExistingBowlDbIds(dbIds);
      
      const snapshots = new Map<number, { dbBowlId: string; mixItems: { productId: string; amount: string; unit: string }[]; developers: { product: string; amount: string; unit: string }[]; notes: string }>();
      loadedBowls.forEach((bowl, idx) => {
        snapshots.set(bowl.id, {
          dbBowlId: dbIds[idx],
          mixItems: bowl.mixItems.map(item => ({ productId: item.product, amount: item.amount, unit: item.unit })),
          developers: bowl.developers.map(dev => ({ product: dev.product, amount: dev.amount, unit: dev.unit })),
          notes: bowl.notes,
        });
      });
      setOriginalBowlSnapshots(snapshots);

      setExistingBowlCount(loadedBowls.length);
      setBowls(loadedBowls);
    };

    fetchExistingBowls();
  }, [existingSessionId, dbProducts, preferredUnit]);

  const addBowl = () => {
    setBowls([...bowls, createNewBowl(bowls.length + 1, preferredUnit)]);
  };

  // Recent formulas for the selected client (only fetched on the service step)
  const historyClientId = step === 'service' && selectedClient ? selectedClient : null;
  const { data: clientHistory, isLoading: clientHistoryLoading } = useClientDetail(historyClientId);

  // Build a Bowl from a FormulaRecord BowlRecord (or flat components)
  const buildBowlFromComponents = useCallback((
    components: { productId?: string; productName: string; amount: number; unit?: string }[] | undefined,
    developer: { productId?: string; name: string; amount: number; unit?: string } | undefined,
    fallbackUnit: string,
    name: string,
    seed: number,
  ): Bowl => {
    const mixItems: Bowl['mixItems'] = [];
    (components || []).forEach((comp, idx) => {
      let match = comp.productId ? colorProducts.find(p => p.id === comp.productId) : undefined;
      if (!match) {
        const cn = comp.productName.toLowerCase();
        match = colorProducts.find(p => {
          const n = p.name.toLowerCase();
          const s = p.shadeCode?.toLowerCase() || '';
          return n === cn || s === cn || n.includes(cn) || cn.includes(n);
        });
      }
      mixItems.push({
        id: seed + idx,
        productType: match?.type === 'Lightener' ? 'Lightener' : 'Color',
        product: match?.id || '',
        amount: String(comp.amount),
        unit: comp.unit || fallbackUnit,
      });
    });
    if (mixItems.length === 0) {
      mixItems.push({ id: seed, productType: 'Color', product: '', amount: '', unit: fallbackUnit });
    }

    let developers: Bowl['developers'] = [{ id: seed + 500, product: '', amount: '', unit: fallbackUnit }];
    if (developer) {
      let devMatch = developer.productId ? developerProducts.find(p => p.id === developer.productId) : undefined;
      if (!devMatch && developer.name) {
        const dn = developer.name.toLowerCase();
        devMatch = developerProducts.find(p => {
          const n = p.name.toLowerCase();
          const s = p.shadeCode?.toLowerCase() || '';
          return n === dn || s === dn || n.includes(dn) || dn.includes(n);
        });
      }
      developers = [{
        id: seed + 500,
        product: devMatch?.id || '',
        amount: developer.amount ? String(developer.amount) : '',
        unit: developer.unit || fallbackUnit,
      }];
    }

    return {
      id: seed,
      name,
      mixItems,
      developers,
      notes: '',
      leftoverUnit: fallbackUnit,
    };
  }, [colorProducts, developerProducts]);

  // Load a previous session's formula into the bowls and advance to the bowl step.
  const loadFormulaRecord = useCallback((record: FormulaRecord) => {
    if (colorProducts.length === 0) {
      toast.error('Products are still loading — please try again in a moment');
      return;
    }
    const fallbackUnit = record.unit || preferredUnit;
    const now = Date.now();

    let newBowls: Bowl[] = [];
    if (record.bowls && record.bowls.length > 0) {
      newBowls = record.bowls.map((b, idx) => {
        const built = buildBowlFromComponents(
          b.components,
          b.developer,
          fallbackUnit,
          b.name || `Bowl ${idx + 1}`,
          now + idx * 1000,
        );
        return { ...built, notes: record.notes || '' };
      });
    } else {
      const built = buildBowlFromComponents(
        record.components,
        record.developer,
        fallbackUnit,
        'Bowl 1',
        now,
      );
      newBowls = [{ ...built, notes: record.notes || '' }];
    }

    // Keep the stylist's service pick if they made one, otherwise inherit from history
    if (!selectedServiceId && record.serviceId) {
      setSelectedServiceId(record.serviceId);
    }
    setBowls(newBowls);
    // Prevent the location.state effect from clobbering this
    hasPopulatedFormula.current = true;
    setStep('bowls');
    toast.success('Loaded previous formula');
  }, [buildBowlFromComponents, colorProducts.length, preferredUnit, selectedServiceId]);


  const updateBowl = (index: number, updatedBowl: Bowl) => {
    setBowls(bowls.map((b, i) => (i === index ? updatedBowl : b)));
  };

  // Auto-fill developer when a color product is selected
  const handleAutoFillDeveloper = useCallback((bowlId: number, colorProduct: Product) => {
    const key = `${colorProduct.brand}|${colorProduct.productLine}`;
    const pref = developerDefaultsMap.get(key);
    if (!pref) return;

    // Find the first developer product matching the preferred line
    const matchingDev = developerProducts.find(
      p => p.brand === pref.brand && p.productLine === pref.line
    );
    if (!matchingDev) return;

    setBowls(prev => prev.map(b => {
      if (b.id !== bowlId) return b;
      // Only fill if first developer row is empty
      if (b.developers[0]?.product) return b;
      return {
        ...b,
        developers: b.developers.map((dev, i) =>
          i === 0 ? { ...dev, product: matchingDev.id } : dev
        ),
      };
    }));
  }, [developerDefaultsMap, developerProducts]);

  const deleteBowl = (index: number) => {
    if (bowls.length > 1) {
      const bowlToDelete = bowls[index];
      // Track if this was an existing bowl that needs DB deletion
      const snapshot = originalBowlSnapshots.get(bowlToDelete.id);
      if (snapshot) {
        setDeletedExistingBowlIds(prev => [...prev, snapshot.dbBowlId]);
        setOriginalBowlSnapshots(prev => {
          const next = new Map(prev);
          next.delete(bowlToDelete.id);
          return next;
        });
      }
      setBowls(bowls.filter((_, i) => i !== index));
    }
  };

  // Add a new Remix version stacked under the bowl. Pre-seeds with the
  // current formula products (but blank amounts) so the stylist can tweak.
  const addRemix = (index: number) => {
    const bowl = bowls[index];
    const seedMixItems = (bowl.mixItems.length > 0 ? bowl.mixItems : [{ productType: "Color", product: "", amount: "", unit: preferredUnit }]).map((item, i) => ({
      id: Date.now() + i,
      productType: item.productType || "Color",
      product: item.product || "",
      amount: item.amount || "",
      unit: item.unit || preferredUnit,
    }));
    const seedDevs = (bowl.developers.length > 0 ? bowl.developers : [{ product: "", amount: "", unit: preferredUnit }]).map((dev, i) => ({
      id: Date.now() + 1000 + i,
      product: dev.product || "",
      amount: dev.amount || "",
      unit: dev.unit || preferredUnit,
    }));
    const newRemix: Remix = {
      id: Date.now() + 9999,
      mixItems: seedMixItems,
      developers: seedDevs,
      notes: bowl.notes || "",
    };
    const updated: Bowl = { ...bowl, remixes: [...(bowl.remixes ?? []), newRemix] };
    setBowls(bowls.map((b, i) => (i === index ? updated : b)));
  };

  const updateRemix = (bowlIndex: number, remixIndex: number, remix: Remix) => {
    const bowl = bowls[bowlIndex];
    const remixes = [...(bowl.remixes ?? [])];
    remixes[remixIndex] = remix;
    setBowls(bowls.map((b, i) => (i === bowlIndex ? { ...bowl, remixes } : b)));
  };

  const removeRemix = (bowlIndex: number, remixIndex: number) => {
    const bowl = bowls[bowlIndex];
    const remixes = [...(bowl.remixes ?? [])];
    const removed = remixes.splice(remixIndex, 1)[0];
    // If this remix had been persisted, mark its DB row for cascade delete
    if (removed?.dbBowlId) {
      setDeletedExistingBowlIds(prev => [...prev, removed.dbBowlId!]);
    }
    setBowls(bowls.map((b, i) => (i === bowlIndex ? { ...bowl, remixes } : b)));
  };

  // Normalize shade codes for matching (e.g., "6 n" -> "6n", "six n" -> "6n")
  const normalizeShadeCode = useCallback((shade: string): string => {
    const spokenNumbers: Record<string, string> = {
      'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
      'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
      'ten': '10', 'eleven': '11', 'twelve': '12'
    };
    
    let normalized = shade.toLowerCase().trim();
    
    // Convert spoken numbers to digits
    for (const [word, digit] of Object.entries(spokenNumbers)) {
      normalized = normalized.replace(new RegExp(`\\b${word}\\b`, 'gi'), digit);
    }
    
    // Remove spaces between number and letter (e.g., "6 n" -> "6n")
    normalized = normalized.replace(/(\d+)\s*([a-zA-Z]+)/g, '$1$2');
    
    return normalized;
  }, []);

  // Find matching product with fuzzy matching
  const findMatchingProduct = useCallback((
    productName: string,
    productList: Product[],
    productId?: string | null
  ): Product | undefined => {
    // Direct ID match first
    if (productId) {
      const idMatch = productList.find(p => p.id === productId);
      if (idMatch) return idMatch;
    }
    
    const normalizedInput = normalizeShadeCode(productName);
    
    // Try exact shade match
    const exactShadeMatch = productList.find(p => 
      normalizeShadeCode(p.shadeCode || '') === normalizedInput
    );
    if (exactShadeMatch) return exactShadeMatch;
    
    // Try shade code contains
    const shadeContains = productList.find(p => {
      const normalizedShade = normalizeShadeCode(p.shadeCode || '');
      return normalizedShade.includes(normalizedInput) || normalizedInput.includes(normalizedShade);
    });
    if (shadeContains) return shadeContains;
    
    // Try name matching
    const nameMatch = productList.find(p => {
      const normalizedName = p.name.toLowerCase();
      return normalizedName.includes(normalizedInput) || normalizedInput.includes(normalizedName);
    });
    if (nameMatch) return nameMatch;
    
    // Try brand + shade
    const brandShadeMatch = productList.find(p => {
      const combined = `${p.brand} ${p.shadeCode || ''}`.toLowerCase();
      return combined.includes(normalizedInput) || normalizedInput.includes(combined);
    });
    
    return brandShadeMatch;
  }, [normalizeShadeCode]);

  // Find matching developer (handles "20 vol", "10 volume", etc.)
  const findMatchingDeveloper = useCallback((
    devName: string,
    devId?: string | null,
    preferredLine?: { brand: string; line: string } | null,
    brandHint?: string | null
  ): Product | undefined => {
    // 1. Direct ID match (highest priority)
    if (devId) {
      const idMatch = developerProducts.find(p => p.id === devId);
      if (idMatch) return idMatch;
    }
    
    const normalized = devName.toLowerCase().replace(/volume|vol/gi, '').trim();
    
    // Extract volume number
    const volumeMatch = normalized.match(/(\d+)/);
    const volume = volumeMatch ? volumeMatch[1] : null;

    // 2. If a specific brand was spoken, match that brand first
    if (brandHint && volume) {
      const brandLower = brandHint.toLowerCase();
      const brandMatch = developerProducts.find(p => {
        const devShade = (p.shadeCode || p.name || '').toLowerCase();
        const matchesBrand = p.brand.toLowerCase().includes(brandLower) || 
                             (p.productLine || '').toLowerCase().includes(brandLower);
        return matchesBrand && devShade.includes(volume);
      });
      if (brandMatch) return brandMatch;
    }

    // 3. If preferred line is set and no explicit brand was spoken, use preferred line
    if (preferredLine && !brandHint && volume) {
      const prefMatch = developerProducts.find(p => {
        const devShade = (p.shadeCode || p.name || '').toLowerCase();
        return p.brand === preferredLine.brand && 
               (p.productLine || '') === preferredLine.line && 
               devShade.includes(volume);
      });
      if (prefMatch) return prefMatch;
    }

    // 4. Fallback to any developer matching the volume
    if (volume) {
      return developerProducts.find(p => {
        const devShade = (p.shadeCode || p.name || '').toLowerCase();
        return devShade.includes(volume);
      });
    }
    
    // Fallback to name matching
    return developerProducts.find(p => 
      p.name.toLowerCase().includes(normalized) || 
      (p.shadeCode || '').toLowerCase().includes(normalized)
    );
  }, [developerProducts]);

  // Handle Mira voice parsing result
  const handleMiraResult = useCallback((result: MiraParseResult) => {
    console.log("[Mira] Processing result:", result);

    // Set client if matched
    if (result.clientId) {
      setSelectedClient(result.clientId);
      console.log("[Mira] Client set by ID:", result.clientId);
    } else if (result.clientName) {
      const clientNameLower = result.clientName.toLowerCase();
      const matchedClient = clients?.find(
        (c) => c.name.toLowerCase().includes(clientNameLower) || 
               clientNameLower.includes(c.name.toLowerCase())
      );
      if (matchedClient) {
        setSelectedClient(matchedClient.id);
        console.log("[Mira] Client matched by name:", matchedClient.name);
      }
    }

    // Convert parsed bowls to our Bowl format
    if (result.bowls && result.bowls.length > 0) {
      const newBowls: Bowl[] = result.bowls.map((parsedBowl, idx) => {
        // Convert items to mixItems with improved matching
        const mixItems = parsedBowl.items.map((item, itemIdx) => {
          const matchedProduct = findMatchingProduct(
            item.productName, 
            colorProducts,
            item.productId
          );
          
          console.log(`[Mira] Product matching: "${item.productName}" -> ${matchedProduct?.name || 'NOT FOUND'}`);

          return {
            id: Date.now() + itemIdx,
            productType: matchedProduct?.type === "Lightener" ? "Lightener" : "Color",
            product: matchedProduct?.id || "",
            amount: item.amount.toString(),
            unit: item.unit as "g" | "ml" | "oz",
          };
        });

        // Handle developers array with improved matching
        let developersData: Bowl['developers'] = [{ id: Date.now() + 1000 + idx, product: "", amount: "", unit: preferredUnit }];
        
        if (parsedBowl.developers && parsedBowl.developers.length > 0) {
          // Determine preferred developer line from matched color products
          let preferredDevLine: { brand: string; line: string } | null = null;
          for (const item of mixItems) {
            if (!item.product) continue;
            const colorProd = colorProducts.find(p => p.id === item.product);
            if (colorProd) {
              const key = `${colorProd.brand}|${colorProd.productLine}`;
              const pref = developerDefaultsMap.get(key);
              if (pref) { preferredDevLine = pref; break; }
            }
          }

          developersData = parsedBowl.developers.map((dev, devIdx) => {
            const matchedDev = findMatchingDeveloper(
              dev.productName,
              dev.productId,
              preferredDevLine,
              dev.brandHint
            );
            
            console.log(`[Mira] Developer matching: "${dev.productName}" (brandHint: ${dev.brandHint || 'none'}, preferred: ${preferredDevLine ? `${preferredDevLine.brand} ${preferredDevLine.line}` : 'none'}) -> ${matchedDev?.name || 'NOT FOUND'}`);

            const unitValue = dev.unit || preferredUnit;
            return {
              id: Date.now() + 1000 + idx * 100 + devIdx,
              product: matchedDev?.id || "",
              amount: dev.amount.toString(),
              unit: unitValue === "ml" ? "ml" : unitValue === "oz" ? "oz" : "g",
            };
          });
        }

        return {
          id: Date.now() + idx,
          name: parsedBowl.name || `Bowl ${idx + 1}`,
          mixItems: mixItems.length > 0 ? mixItems : [{ id: Date.now(), productType: "Color", product: "", amount: "", unit: preferredUnit as "g" | "oz" | "ml" }],
          developers: developersData,
          notes: parsedBowl.notes || "",
          leftoverUnit: preferredUnit as "g" | "oz" | "ml",
        };
      });

      setBowls(newBowls);
      
      // Show detailed toast with what was understood
      const itemCount = newBowls.reduce((sum, b) => sum + b.mixItems.filter(i => i.product).length, 0);
      const devCount = newBowls.reduce((sum, b) => sum + b.developers.filter(d => d.product).length, 0);
      toast.success(
        `Mira added ${itemCount} product${itemCount !== 1 ? 's' : ''} and ${devCount} developer${devCount !== 1 ? 's' : ''}`
      );
    }
  }, [clients, colorProducts, findMatchingProduct, findMatchingDeveloper]);

  // Helper: check if a bowl was modified from its original snapshot
  const isBowlModified = (bowl: Bowl): boolean => {
    const snapshot = originalBowlSnapshots.get(bowl.id);
    if (!snapshot) return false; // Not an existing bowl
    
    // Compare mix items
    const currentItems = bowl.mixItems.filter(i => i.product && i.amount);
    if (currentItems.length !== snapshot.mixItems.length) return true;
    for (let i = 0; i < currentItems.length; i++) {
      const curr = currentItems[i];
      const orig = snapshot.mixItems[i];
      if (!orig || curr.product !== orig.productId || curr.amount !== orig.amount || curr.unit !== orig.unit) return true;
    }
    
    // Compare developers
    const currentDevs = bowl.developers.filter(d => d.product && d.amount);
    if (currentDevs.length !== snapshot.developers.length) return true;
    for (let i = 0; i < currentDevs.length; i++) {
      const curr = currentDevs[i];
      const orig = snapshot.developers[i];
      if (!orig || curr.product !== orig.product || curr.amount !== orig.amount || curr.unit !== orig.unit) return true;
    }
    
    // Compare notes
    if (bowl.notes !== snapshot.notes) return true;

    // Any remix presence or change counts as a modification — they are
    // persisted via a "wipe and re-insert" pass keyed off the parent bowl.
    if ((bowl.remixes?.length ?? 0) > 0) return true;
    // If we previously had remixes (tracked by their dbBowlId being present
    // in deletedExistingBowlIds), the deletion path handles it; but to be
    // safe, also flag bowls whose snapshot indicates prior child rows.
    
    return false;
  };

  const handleLogBowls = async () => {
    if (!selectedClient) {
      toast.error("Please select a client before logging bowls");
      return;
    }

    // Separate bowls into: existing (possibly modified), new
    const existingBowls = existingSessionId 
      ? bowls.filter(b => originalBowlSnapshots.has(b.id))
      : [];
    const newBowls = existingSessionId 
      ? bowls.filter(b => !originalBowlSnapshots.has(b.id))
      : bowls;

    // Check that there's at least something to save (new bowls with products, or modified existing, or deleted)
    const hasNewProducts = newBowls.some(bowl => 
      bowl.mixItems.some(item => item.product && parseFloat(item.amount) > 0) ||
      bowl.developers.some(dev => dev.product && parseFloat(dev.amount) > 0)
    );
    const hasModifiedExisting = existingBowls.some(b => isBowlModified(b));
    const hasDeletedExisting = deletedExistingBowlIds.length > 0;
    
    if (!hasNewProducts && !hasModifiedExisting && !hasDeletedExisting) {
      toast.error("Please add at least one product or make changes to save");
      return;
    }

    setIsLogging(true);

    try {
      let totalSessionCost = 0;

      // Helper to compute bowl totals
      const computeBowlData = (bowl: Bowl) => {
        const colorMixed = bowl.mixItems.reduce((sum, item) => {
          if (!item.amount) return sum;
          return sum + convertToGrams(parseFloat(item.amount), item.unit);
        }, 0);
        const devMixed = bowl.developers.reduce((sum, dev) => {
          if (!dev.amount) return sum;
          return sum + convertToGrams(parseFloat(dev.amount), dev.unit);
        }, 0);
        const bowlMixed = colorMixed + devMixed;
        let leftoverGrams = 0;
        if (bowl.bowlPresetId && bowl.reweighedAmount) {
          const reweighG = convertToGrams(parseFloat(bowl.reweighedAmount) || 0, bowl.reweighedUnit || 'g');
          const tareG = convertToGrams(Number(bowl.bowlTareWeight) || 0, bowl.bowlTareUnit || 'g');
          leftoverGrams = Math.max(0, reweighG - tareG);
        } else if (bowl.leftoverAmount) {
          leftoverGrams = convertToGrams(parseFloat(bowl.leftoverAmount) || 0, bowl.leftoverUnit || 'g');
        }
        const bowlUsed = Math.max(0, bowlMixed - leftoverGrams);
        return { bowl, amountMixed: bowlMixed, amountUsed: bowlUsed };
      };

      // Forward-declare so the remix helpers (defined next) can read it after
      // it's assigned later in this handler.
      let sessionId: string;

      // ── Remix persistence helpers ──────────────────────────────────────────

      // Reverse the stock deductions previously made by the items belonging
      // to the given bowl_id (used when deleting/rewriting a remix or a bowl).
      const reverseStockForBowlId = async (bowlId: string) => {
        if (!dbProducts) return;
        const { data: oldItems } = await supabase
          .from('bowl_items')
          .select('product_id, amount, unit')
          .eq('bowl_id', bowlId);
        for (const item of (oldItems || [])) {
          const product = dbProducts.find(p => p.id === item.product_id);
          if (!product || !product.size || product.size <= 0) continue;
          const productSizeUnit = product.size_unit || 'ml';
          const amountInProductUnit = convertAmountBetweenUnits(Number(item.amount), item.unit, productSizeUnit);
          const tubesUsed = amountInProductUnit / Number(product.size);
          await adjustStock(item.product_id, tubesUsed);
        }
      };

      // Reverse stock for every remix (child) row attached to a parent bowl.
      const reverseStockForChildRemixes = async (parentDbId: string) => {
        const { data: childRows } = await supabase
          .from('session_bowls')
          .select('id')
          .eq('parent_bowl_id', parentDbId);
        for (const row of (childRows || [])) {
          await reverseStockForBowlId(row.id);
        }
      };

      // Wipes any previously-persisted remix rows for a parent bowl, then
      // inserts the current in-state remixes as fresh child rows + bowl_items
      // and deducts inventory for each remix item.
      const persistRemixesForParent = async (parentDbId: string, parentBowl: Bowl, parentName: string) => {
        const remixes = parentBowl.remixes ?? [];

        // Reverse + delete any existing child remix rows for this parent
        const { data: existingChildren } = await supabase
          .from('session_bowls')
          .select('id')
          .eq('parent_bowl_id', parentDbId);
        for (const row of (existingChildren || [])) {
          await reverseStockForBowlId(row.id);
        }
        if (existingChildren && existingChildren.length > 0) {
          const childIds = existingChildren.map((r: any) => r.id);
          await supabase.from('bowl_items').delete().in('bowl_id', childIds);
          await supabase.from('session_bowls').delete().in('id', childIds);
        }

        // Insert each current remix as a fresh child row + items
        for (let i = 0; i < remixes.length; i++) {
          const remix = remixes[i];
          const validItems = remix.mixItems.filter(item => item.product && item.amount);
          const validDevs = remix.developers.filter(d => d.product && d.amount);
          if (validItems.length === 0 && validDevs.length === 0) continue;

          const remixMixed =
            remix.mixItems.reduce((s, it) => s + (it.amount ? convertToGrams(parseFloat(it.amount), it.unit) : 0), 0) +
            remix.developers.reduce((s, d) => s + (d.amount ? convertToGrams(parseFloat(d.amount), d.unit) : 0), 0);
          const firstDev = remix.developers.find(d => d.product && d.amount);

          const { data: childRow, error: childErr } = await supabase
            .from('session_bowls')
            .insert({
              session_id: sessionId,
              parent_bowl_id: parentDbId,
              remix_index: i + 1,
              name: `${parentName} — Remix v${i + 2}`,
              developer_product_id: firstDev?.product || null,
              developer_amount: firstDev?.amount ? parseFloat(firstDev.amount) : null,
              developer_unit: firstDev?.unit || 'g',
              amount_mixed: remixMixed,
              amount_used: remixMixed, // remixes don't have their own re-weigh; treat as fully used
              notes: remix.notes || null,
              tenant_id: tenantId,
            } as any)
            .select()
            .single();
          if (childErr) throw childErr;

          if (validItems.length > 0) {
            await supabase.from('bowl_items').insert(validItems.map(item => ({
              bowl_id: childRow.id,
              product_id: item.product,
              amount: parseFloat(item.amount),
              unit: item.unit,
              tenant_id: tenantId,
              item_type: 'color',
            })));
          }
          if (validDevs.length > 0) {
            await supabase.from('bowl_items').insert(validDevs.map(d => ({
              bowl_id: childRow.id,
              product_id: d.product,
              amount: parseFloat(d.amount),
              unit: d.unit,
              tenant_id: tenantId,
              item_type: 'developer',
            })));
          }

          // Deduct stock for this remix's items
          if (dbProducts) {
            for (const item of validItems) {
              const amount = parseFloat(item.amount);
              if (isNaN(amount) || amount <= 0) continue;
              const product = dbProducts.find(p => p.id === item.product);
              if (!product || !product.size || product.size <= 0) continue;
              const productSizeUnit = product.size_unit || 'ml';
              const amountInProductUnit = convertAmountBetweenUnits(amount, item.unit, productSizeUnit);
              await adjustStock(item.product, -(amountInProductUnit / Number(product.size)));
            }
            for (const dev of validDevs) {
              const amount = parseFloat(dev.amount);
              if (isNaN(amount) || amount <= 0) continue;
              const devProduct = dbProducts.find(p => p.id === dev.product);
              if (!devProduct || !devProduct.size || devProduct.size <= 0) continue;
              const devSizeUnit = devProduct.size_unit || 'ml';
              const devInUnit = convertAmountBetweenUnits(amount, dev.unit, devSizeUnit);
              await adjustStock(dev.product, -(devInUnit / Number(devProduct.size)));
            }
          }
        }
      };




      const newBowlData = newBowls.filter(bowl => 
        bowl.mixItems.some(item => item.product && parseFloat(item.amount) > 0) ||
        bowl.developers.some(dev => dev.product && parseFloat(dev.amount) > 0)
      ).map(computeBowlData);




      if (existingSessionId) {
        sessionId = existingSessionId;

        // === Handle deleted existing bowls (and their child remix rows) ===
        for (const deletedBowlId of deletedExistingBowlIds) {
          // Reverse stock for any child remix rows attached to this bowl
          // before CASCADE deletes them.
          await reverseStockForChildRemixes(deletedBowlId);
          // Reverse inventory for deleted bowl
          if (dbProducts) {
            // item_type MUST be selected — the legacy-developer check below reads
            // it. Without it every deleted bowl restored developer stock twice.
            const { data: oldItems } = await supabase
              .from('bowl_items')
              .select('product_id, amount, unit, item_type')
              .eq('bowl_id', deletedBowlId);
            
            const { data: oldBowl } = await supabase
              .from('session_bowls')
              .select('developer_product_id, developer_amount, developer_unit')
              .eq('id', deletedBowlId)
              .single();

            // Reverse stock deductions for items (both color and developer bowl_items)
            for (const item of (oldItems || [])) {
              const product = dbProducts.find(p => p.id === item.product_id);
              if (!product || !product.size || product.size <= 0) continue;
              const productSizeUnit = product.size_unit || 'ml';
              const amountInProductUnit = convertAmountBetweenUnits(Number(item.amount), item.unit, productSizeUnit);
              const tubesUsed = amountInProductUnit / Number(product.size);
              await adjustStock(item.product_id, tubesUsed);
            }

            // Reverse stock for legacy developer (session_bowls columns) — only if no developer bowl_items existed
            const hasDeveloperItems = (oldItems || []).some((i: any) => i.item_type === 'developer');
            if (!hasDeveloperItems && oldBowl?.developer_product_id && oldBowl?.developer_amount) {
              const devProduct = dbProducts.find(p => p.id === oldBowl.developer_product_id);
              if (devProduct && devProduct.size && devProduct.size > 0) {
                const devSizeUnit = devProduct.size_unit || 'ml';
                const devInUnit = convertAmountBetweenUnits(Number(oldBowl.developer_amount), oldBowl.developer_unit || 'g', devSizeUnit);
                const devTubes = devInUnit / Number(devProduct.size);
                await adjustStock(oldBowl.developer_product_id, devTubes);
              }
            }
          }

          // Delete bowl items then bowl
          await supabase.from('bowl_items').delete().eq('bowl_id', deletedBowlId);
          await supabase.from('session_bowls').delete().eq('id', deletedBowlId);
        }

        // === Handle modified existing bowls ===
        for (const bowl of existingBowls) {
          if (!isBowlModified(bowl)) continue;
          
          const snapshot = originalBowlSnapshots.get(bowl.id)!;
          const dbBowlId = snapshot.dbBowlId;
          const bowlCalc = computeBowlData(bowl);

          // Reverse old inventory deductions
          if (dbProducts) {
            const { data: oldItems } = await supabase
              .from('bowl_items')
              .select('product_id, amount, unit, item_type')
              .eq('bowl_id', dbBowlId);

            for (const item of (oldItems || [])) {
              const product = dbProducts.find(p => p.id === item.product_id);
              if (!product || !product.size || product.size <= 0) continue;
              const productSizeUnit = product.size_unit || 'ml';
              const amountInProductUnit = convertAmountBetweenUnits(Number(item.amount), item.unit, productSizeUnit);
              const tubesUsed = amountInProductUnit / Number(product.size);
              await adjustStock(item.product_id, tubesUsed);
            }

            // Reverse old legacy developer stock (only if no developer bowl_items)
            const hadDeveloperItems = (oldItems || []).some((i: any) => i.item_type === 'developer');
            if (!hadDeveloperItems) {
              const { data: oldBowlRow } = await supabase
                .from('session_bowls')
                .select('developer_product_id, developer_amount, developer_unit')
                .eq('id', dbBowlId)
                .single();
              
              if (oldBowlRow?.developer_product_id && oldBowlRow?.developer_amount) {
                const devProduct = dbProducts.find(p => p.id === oldBowlRow.developer_product_id);
                if (devProduct && devProduct.size && devProduct.size > 0) {
                  const devSizeUnit = devProduct.size_unit || 'ml';
                  const devInUnit = convertAmountBetweenUnits(Number(oldBowlRow.developer_amount), oldBowlRow.developer_unit || 'g', devSizeUnit);
                  const devTubes = devInUnit / Number(devProduct.size);
                  await adjustStock(oldBowlRow.developer_product_id, devTubes);
                }
              }
            }
          }

          // Delete old bowl items, re-insert new ones
          await supabase.from('bowl_items').delete().eq('bowl_id', dbBowlId);

          // Get first developer for backward-compat session_bowls columns
          const firstDev = bowl.developers.find(d => d.product && d.amount);

          // Update the session_bowls row
          await supabase
            .from('session_bowls')
            .update({
              name: bowl.name,
              developer_product_id: firstDev?.product || null,
              developer_amount: firstDev?.amount ? parseFloat(firstDev.amount) : null,
              developer_unit: firstDev?.unit || 'g',
              amount_mixed: bowlCalc.amountMixed,
              amount_used: bowlCalc.amountUsed,
              notes: bowl.notes || null,
              bowl_preset_id: bowl.bowlPresetId || null,
              bowl_tare_weight: bowl.bowlTareWeight ?? null,
              bowl_tare_unit: bowl.bowlTareUnit || null,
              reweighed_amount: bowl.reweighedAmount ? parseFloat(bowl.reweighedAmount) : null,
              reweighed_unit: bowl.reweighedUnit || null,
            } as any)

            .eq('id', dbBowlId);

          // Re-insert color bowl items
          const validItems = bowl.mixItems.filter(item => item.product && item.amount);
          if (validItems.length > 0) {
            const bowlItems = validItems.map(item => ({
              bowl_id: dbBowlId,
              product_id: item.product,
              amount: parseFloat(item.amount),
              unit: item.unit,
              tenant_id: tenantId,
              item_type: 'color',
            }));
            await supabase.from('bowl_items').insert(bowlItems);
          }

          // Re-insert developer bowl items
          const validDevs = bowl.developers.filter(d => d.product && d.amount);
          if (validDevs.length > 0) {
            const devItems = validDevs.map(d => ({
              bowl_id: dbBowlId,
              product_id: d.product,
              amount: parseFloat(d.amount),
              unit: d.unit,
              tenant_id: tenantId,
              item_type: 'developer',
            }));
            await supabase.from('bowl_items').insert(devItems);
          }

          // Deduct new inventory (color items)
          if (dbProducts) {
            for (const item of bowl.mixItems) {
              if (!item.product || !item.amount) continue;
              const amount = parseFloat(item.amount);
              if (isNaN(amount) || amount <= 0) continue;
              const product = dbProducts.find(p => p.id === item.product);
              if (!product || !product.size || product.size <= 0) continue;
              const productSizeUnit = product.size_unit || 'ml';
              const amountInProductUnit = convertAmountBetweenUnits(amount, item.unit, productSizeUnit);
              const tubesUsed = amountInProductUnit / Number(product.size);
              await adjustStock(item.product, -tubesUsed);
            }

            // Deduct new inventory (developers)
            for (const dev of bowl.developers) {
              if (!dev.product || !dev.amount) continue;
              const devAmount = parseFloat(dev.amount);
              if (isNaN(devAmount) || devAmount <= 0) continue;
              const devProduct = dbProducts.find(p => p.id === dev.product);
              if (!devProduct || !devProduct.size || devProduct.size <= 0) continue;
              const devSizeUnit = devProduct.size_unit || 'ml';
              const devInUnit = convertAmountBetweenUnits(devAmount, dev.unit, devSizeUnit);
              const devTubes = devInUnit / Number(devProduct.size);
              await adjustStock(dev.product, -devTubes);
            }
          }

          // Persist (or refresh) this bowl's Remix versions as child rows
          await persistRemixesForParent(dbBowlId, bowl, bowl.name);
        }

        // Session totals will be recalculated below after new bowls are added
      } else {
        // Create new color session
        const totalMixed = newBowlData.reduce((s, b) => s + b.amountMixed, 0);
        const totalUsed = newBowlData.reduce((s, b) => s + b.amountUsed, 0);
        
        const { data: session, error: sessionError } = await supabase
          .from('color_sessions')
          .insert({
            client_id: selectedClient,
            stylist_id: effectiveStaff?.id || null,
            session_date: new Date().toISOString().split('T')[0],
            total_amount_mixed: totalMixed,
            total_amount_used: totalUsed,
            total_cost: 0,
            notes: newBowls.map(b => b.notes).filter(Boolean).join('\n---\n') || null,
            tenant_id: tenantId,
            service_id: selectedService?.id || null,
            canvas_data: sessionCanvas as any,
            canvas_preview_url: sessionCanvasPreviewUrl,
          } as any)
          .select()
          .single();

        if (sessionError) throw sessionError;
        sessionId = session.id;
      }

      // Create new session bowls and bowl items
      for (const { bowl, amountMixed, amountUsed } of newBowlData) {
        // Get first developer for backward-compat session_bowls columns
        const firstDev = bowl.developers.find(d => d.product && d.amount);

        const { data: sessionBowl, error: bowlError } = await supabase
          .from('session_bowls')
          .insert({
            session_id: sessionId,
            name: bowl.name,
            developer_product_id: firstDev?.product || null,
            developer_amount: firstDev?.amount ? parseFloat(firstDev.amount) : null,
            developer_unit: firstDev?.unit || 'g',
            amount_mixed: amountMixed,
            amount_used: amountUsed,
            notes: bowl.notes || null,
            tenant_id: tenantId,
            bowl_preset_id: bowl.bowlPresetId || null,
            bowl_tare_weight: bowl.bowlTareWeight ?? null,
            bowl_tare_unit: bowl.bowlTareUnit || null,
            reweighed_amount: bowl.reweighedAmount ? parseFloat(bowl.reweighedAmount) : null,
            reweighed_unit: bowl.reweighedUnit || null,
          } as any)

          .select()
          .single();

        if (bowlError) throw bowlError;

        // Create bowl items for color mix items
        const validItems = bowl.mixItems.filter(item => item.product && item.amount);
        if (validItems.length > 0) {
          const bowlItems = validItems.map(item => ({
            bowl_id: sessionBowl.id,
            product_id: item.product,
            amount: parseFloat(item.amount),
            unit: item.unit,
            tenant_id: tenantId,
            item_type: 'color',
          }));

          const { error: itemsError } = await supabase
            .from('bowl_items')
            .insert(bowlItems);

          if (itemsError) throw itemsError;
        }

        // Create bowl items for developers
        const validDevs = bowl.developers.filter(d => d.product && d.amount);
        if (validDevs.length > 0) {
          const devItems = validDevs.map(d => ({
            bowl_id: sessionBowl.id,
            product_id: d.product,
            amount: parseFloat(d.amount),
            unit: d.unit,
            tenant_id: tenantId,
            item_type: 'developer',
          }));

          const { error: devItemsError } = await supabase
            .from('bowl_items')
            .insert(devItems);

          if (devItemsError) throw devItemsError;
        }

        // Persist this bowl's Remix versions as child rows + items
        await persistRemixesForParent(sessionBowl.id, bowl, bowl.name);
      }

      // === Auto-deduct inventory stock for NEW bowls only ===
      if (dbProducts) {
        const productUsage: Map<string, { totalAmount: number; unit: string }> = new Map();

        for (const { bowl } of newBowlData) {
          // Accumulate color product usage
          for (const item of bowl.mixItems) {
            if (!item.product || !item.amount) continue;
            const amount = parseFloat(item.amount);
            if (isNaN(amount) || amount <= 0) continue;

            const existing = productUsage.get(item.product);
            if (existing) {
              existing.totalAmount += convertAmountBetweenUnits(amount, item.unit, existing.unit);
            } else {
              productUsage.set(item.product, { totalAmount: amount, unit: item.unit });
            }
          }

          // Accumulate developer usage
          for (const dev of bowl.developers) {
            if (!dev.product || !dev.amount) continue;
            const devAmount = parseFloat(dev.amount);
            if (isNaN(devAmount) || devAmount <= 0) continue;

            const existing = productUsage.get(dev.product);
            if (existing) {
              existing.totalAmount += convertAmountBetweenUnits(devAmount, dev.unit, existing.unit);
            } else {
              productUsage.set(dev.product, { totalAmount: devAmount, unit: dev.unit });
            }
          }
        }

        const skippedProducts: string[] = [];
        for (const [productId, usage] of productUsage) {
          const product = dbProducts.find(p => p.id === productId);
          if (!product || !product.size || product.size <= 0) {
            // Never fail silently — the owner must know inventory didn't move.
            if (product) skippedProducts.push([product.brand, product.name, product.shade].filter(Boolean).join(' '));
            continue;
          }

          const productSizeUnit = product.size_unit || 'ml';
          const amountInProductUnit = convertAmountBetweenUnits(usage.totalAmount, usage.unit, productSizeUnit);
          const tubesUsed = amountInProductUnit / Number(product.size);

          await adjustStock(productId, -tubesUsed);
        }
        if (skippedProducts.length > 0) {
          toast.warning(`Inventory NOT deducted for ${skippedProducts.join(', ')} — missing container size. Fix in Inventory → edit product.`);
        }
      }

      // Recalculate total session cost from ALL current bowls
      const allCurrentBowls = bowls.filter(b => !deletedExistingBowlIds.some(id => {
        const snap = [...originalBowlSnapshots.values()].find(s => s.dbBowlId === id);
        return snap !== undefined;
      }));
      
      for (const bowl of allCurrentBowls) {
        for (const item of bowl.mixItems) {
          if (!item.product || !item.amount) continue;
          const product = dbProducts?.find(p => p.id === item.product);
          if (!product) continue;
          const productSizeUnit = product.size_unit || 'ml';
          const amountInProductUnit = convertAmountBetweenUnits(
            parseFloat(item.amount), item.unit, productSizeUnit
          );
          totalSessionCost += amountInProductUnit * (Number(product.cost_per_unit) || 0);
        }
        for (const dev of bowl.developers) {
          if (!dev.product || !dev.amount) continue;
          const devProduct = dbProducts?.find(p => p.id === dev.product);
          if (!devProduct) continue;
          const devSizeUnit = devProduct.size_unit || 'ml';
          const devAmountInProductUnit = convertAmountBetweenUnits(
            parseFloat(dev.amount), dev.unit, devSizeUnit
          );
          totalSessionCost += devAmountInProductUnit * (Number(devProduct.cost_per_unit) || 0);
        }
      }

      // Recalculate session totals
      if (existingSessionId) {
        const { data: allSessionBowls } = await supabase
          .from('session_bowls')
          .select('amount_mixed, amount_used')
          .eq('session_id', sessionId);
        
        const totalMixed = (allSessionBowls || []).reduce((s, b) => s + (Number(b.amount_mixed) || 0), 0);
        const totalUsed = (allSessionBowls || []).reduce((s, b) => s + (Number(b.amount_used) || 0), 0);

        await supabase
          .from('color_sessions')
          .update({ 
            total_amount_mixed: totalMixed,
            total_amount_used: totalUsed,
            total_cost: Math.round(totalSessionCost * 100) / 100,
            notes: bowls.filter(b => b.notes).map(b => b.notes).join('\n---\n') || null,
            canvas_data: sessionCanvas as any,
            canvas_preview_url: sessionCanvasPreviewUrl,
          } as any)
          .eq('id', sessionId);
      } else {
        await supabase
          .from('color_sessions')
          .update({
            total_cost: Math.round(totalSessionCost * 100) / 100,
            canvas_data: sessionCanvas as any,
            canvas_preview_url: sessionCanvasPreviewUrl,
          } as any)
          .eq('id', sessionId);
      }

      // Invalidate queries to refresh formula history, reports, and inventory
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clientDetail'] });
      queryClient.invalidateQueries({ queryKey: ['color-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['staff-report-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['staff-report-bowls'] });
      queryClient.invalidateQueries({ queryKey: ['staff-report-member'] });
      queryClient.invalidateQueries({ queryKey: ['report-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['report-bowl-data'] });
      queryClient.invalidateQueries({ queryKey: ['report-staff'] });
      queryClient.invalidateQueries({ queryKey: ['salon-settings-reports'] });
      queryClient.invalidateQueries({ queryKey: ['report-service-menu'] });
      queryClient.invalidateQueries({ queryKey: ['report-aggregates'] });

      // Show Maria suggestion if there was significant waste
      const totalMixedAll = allCurrentBowls.reduce((s, b) => {
        const colorG = b.mixItems.reduce((ss, item) => {
          if (!item.amount) return ss;
          return ss + convertToGrams(parseFloat(item.amount), item.unit);
        }, 0);
        const devG = b.developers.reduce((ss, dev) => {
          if (!dev.amount) return ss;
          return ss + convertToGrams(parseFloat(dev.amount), dev.unit);
        }, 0);
        return s + colorG + devG;
      }, 0);

      if (totalMixedAll > 50) {
        const selectedClientData = clients?.find(c => c.id === selectedClient);
        const clientName = selectedClientData?.name || "this client";
        const totalUsedAll = allCurrentBowls.reduce((s, b) => {
          const colorG = b.mixItems.reduce((ss, item) => {
            if (!item.amount) return ss;
            return ss + convertToGrams(parseFloat(item.amount), item.unit);
          }, 0);
          const devG = b.developers.reduce((ss, dev) => {
            if (!dev.amount) return ss;
            return ss + convertToGrams(parseFloat(dev.amount), dev.unit);
          }, 0);
          const mixed = colorG + devG;
          let leftover = 0;
          if (b.bowlPresetId && b.reweighedAmount) {
            const reweighG = convertToGrams(parseFloat(b.reweighedAmount) || 0, b.reweighedUnit || 'g');
            const tareG = convertToGrams(Number(b.bowlTareWeight) || 0, b.bowlTareUnit || 'g');
            leftover = Math.max(0, reweighG - tareG);
          } else if (b.leftoverAmount) {
            leftover = convertToGrams(parseFloat(b.leftoverAmount), b.leftoverUnit || 'g');
          }
          return s + Math.max(0, mixed - leftover);

        }, 0);
        
        const suggestion = generateMariaSuggestion(clientName, totalMixedAll, totalUsedAll);
        if (suggestion) {
          setMariaSuggestion(suggestion);
        }
      }

      toast.success(existingSessionId ? "Session updated!" : "Color session saved successfully!");
      
      // Set the session ID so future saves add to this session
      if (!existingSessionId) {
        setExistingSessionId(sessionId);
      }
      
      // Update snapshots for the current bowls (they're now "existing")
      const currentBowlsWithoutNew = bowls.filter(b => !deletedExistingBowlIds.some(id => {
        const snap = [...originalBowlSnapshots.values()].find(s => s.dbBowlId === id);
        return snap !== undefined;
      }));
      
      // Reset state for next round
      setExistingBowlCount(currentBowlsWithoutNew.length);
      setDeletedExistingBowlIds([]);
      setSessionSaved(true);

      // Store color-to-developer ratios for ratio memory
      for (const b of bowls) {
        const firstColor = b.mixItems.find(i => i.product && i.amount && parseFloat(i.amount) > 0);
        const firstDev = b.developers.find(d => d.product && d.amount && parseFloat(d.amount) > 0);
        if (firstColor && firstDev) {
          const colorProduct = colorProducts.find(p => p.id === firstColor.product);
          if (colorProduct) {
            const colorAmt = parseFloat(firstColor.amount);
            const devAmt = parseFloat(firstDev.amount);
            if (colorAmt > 0) {
              const brandLine = `${colorProduct.brand}|${colorProduct.productLine}`;
              storeRatio(brandLine, devAmt / colorAmt);
            }
          }
        }
      }

    } catch (error) {
      console.error('Error saving color session:', error);
      toast.error("Failed to save color session");
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <PageLayout
        title={existingSessionId ? "Continue Session" : "New Color Session"}
        subtitle={existingSessionId ? "Add more bowls to today's session" : "Log your mix and update inventory"}
      >
        <div className="max-w-5xl mx-auto pb-32">
          {(() => {
            const order = ['client', 'service', 'bowls'] as const;
            const currentIdx = order.indexOf(step);
            const stepMeta = [
              { key: 'client' as const, label: 'Client', icon: User, title: 'Who are you working on?', subtitle: 'Search for a client or add a new one to start their color record.' },
              { key: 'service' as const, label: 'Service', icon: ScissorsIcon, title: 'What service are you doing?', subtitle: 'Pick the service so we can include the right allotment.' },
              { key: 'bowls' as const, label: 'Bowls', icon: FlaskConical, title: 'Mix your bowls', subtitle: 'Log each bowl, ingredients, and developer.' },
            ];
            const activeMeta = stepMeta[currentIdx];
            const clientName = clients?.find(c => c.id === selectedClient)?.name;

            return (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Side progress rail */}
                <nav className="lg:col-span-3 lg:sticky lg:top-24">
                  <ul className="relative flex lg:flex-col gap-6 lg:gap-8 lg:pl-0">
                    <div className="hidden lg:block absolute left-[11px] top-3 bottom-3 w-px bg-foreground/15" aria-hidden />
                    {stepMeta.map((s, i) => {
                      const isActive = i === currentIdx;
                      const isDone = i < currentIdx;
                      const canJump = i <= currentIdx;
                      const summary = i === 0 ? clientName : i === 1 ? (selectedService?.name || (currentIdx >= 1 ? 'No service' : undefined)) : (bowls.length > 0 && currentIdx === 2 ? `${bowls.length} bowl${bowls.length === 1 ? '' : 's'}` : undefined);
                      return (
                        <li key={s.key} className="relative flex-1 lg:flex-none min-w-0">
                          <button
                            type="button"
                            onClick={() => canJump && setStep(s.key)}
                            disabled={!canJump}
                            className={cn(
                              "group flex items-center gap-3 lg:gap-4 w-full text-left transition-opacity",
                              !isActive && !isDone && "opacity-30",
                              !canJump && "cursor-not-allowed"
                            )}
                          >
                            <span
                              className={cn(
                                "relative z-10 w-6 h-6 flex items-center justify-center border border-foreground rounded-full shrink-0 transition-colors",
                                (isActive || isDone) ? "bg-foreground" : "bg-background"
                              )}
                            >
                              {isDone ? (
                                <Check className="w-3 h-3 text-background" strokeWidth={3} />
                              ) : (
                                <span className={cn("w-1.5 h-1.5 rounded-full", isActive ? "bg-background" : "bg-foreground")} />
                              )}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-foreground truncate">
                                {s.label}
                              </span>
                              {summary && (
                                <span className="hidden lg:block text-xs text-muted-foreground mt-0.5 truncate font-medium">
                                  {summary}
                                </span>
                              )}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </nav>

                {/* Glass workspace */}
                <main className="lg:col-span-9 relative">
                  <div className="hidden lg:block absolute -inset-2 bg-card/30 border border-foreground/10 pointer-events-none" aria-hidden />
                  <div className="relative bg-card/60 backdrop-blur-md border border-foreground/15 p-6 sm:p-10 lg:p-12 min-h-[400px]">
                    <div className="mb-6">
                      <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-muted-foreground mb-3 block">
                        Step {String(currentIdx + 1).padStart(2, '0')} / 03
                      </span>
                      <h2 className="font-display uppercase text-2xl sm:text-3xl tracking-tight text-foreground">
                        {activeMeta.title}
                      </h2>
                      <p className="text-sm text-muted-foreground mt-2 max-w-lg">
                        {activeMeta.subtitle}
                      </p>
                    </div>

                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={step}
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -16 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      >
                        {step === 'client' && (
                          <div>
                            <ClientSearchPanel
                              clients={clients?.map(c => ({ id: c.id, name: c.name, email: c.email, phone: c.phone, lastVisitAt: c.lastVisitAt })) || []}
                              value={selectedClient}
                              onValueChange={async (id) => {
                                setSelectedClient(id);
                                if (!id) return;

                                // Auto-resume a session started for this client within the last 12 hours
                                try {
                                  const { data: recent } = await supabase
                                    .from('color_sessions')
                                    .select('id, service_id, created_at')
                                    .eq('client_id', id)
                                    .eq('tenant_id', tenantId)
                                    .order('created_at', { ascending: false })
                                    .limit(1)
                                    .maybeSingle();

                                  const within12h = recent?.created_at
                                    ? (Date.now() - new Date(recent.created_at).getTime()) < 12 * 60 * 60 * 1000
                                    : false;

                                  if (recent && within12h) {
                                    setExistingSessionId(recent.id);
                                    if (recent.service_id) setSelectedServiceId(recent.service_id);
                                    setStep('bowls');
                                    toast.success("Continuing your session from earlier today");
                                    return;
                                  }
                                } catch (err) {
                                  console.error("Failed to check for recent session", err);
                                }

                                setStep('service');
                              }}
                              isLoading={clientsLoading}
                              placeholder="Search clients..."
                              onAddNew={(name) => {
                                setPrefillClientName(name);
                                setShowAddClient(true);
                              }}
                            />
                          </div>
                        )}

                        {step === 'service' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => { setSelectedServiceId(""); setStep('bowls'); }}
                              className={cn(
                                "text-left p-4 border transition-colors",
                                "border-foreground/15 hover:border-foreground"
                              )}
                            >
                              <div className="font-display uppercase tracking-tight text-sm">No service</div>
                              <div className="text-xs text-muted-foreground mt-1">Charge all product used</div>
                            </button>
                            {services.map(s => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => setSelectedServiceId(s.id)}
                                className={cn(
                                  "text-left p-4 border transition-colors",
                                  selectedServiceId === s.id ? "border-foreground bg-foreground/5" : "border-foreground/15 hover:border-foreground"
                                )}
                              >
                                <div className="font-display uppercase tracking-tight text-sm">{s.name}</div>
                                <div className="text-xs text-muted-foreground mt-1">${s.price.toFixed(2)}</div>
                              </button>
                            ))}
                          </div>
                        )}

                        {step === 'service' && selectedClient && selectedService && !existingSessionId && (() => {
                          const formatComponents = (r: FormulaRecord) => {
                            const parts = (r.components || []).slice(0, 4).map(c =>
                              `${c.productName} ${c.amount}${c.unit || r.unit || 'g'}`
                            );
                            const more = (r.components?.length || 0) - parts.length;
                            let s = parts.join(' + ');
                            if (more > 0) s += ` +${more} more`;
                            if (r.developer) s += ` · ${r.developer.name} ${r.developer.amount}${r.unit || 'g'}`;
                            return s || 'No formula recorded';
                          };

                          const matches = (clientHistory || [])
                            .filter(r => r.serviceId === selectedService.id)
                            .slice(0, 5);

                          return (
                            <div className="mt-6 border-t border-foreground/10 pt-6">
                              <div className="flex items-center justify-between mb-3">
                                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                  Previous {selectedService.name} visits{matches.length > 0 ? ' — tap to reuse' : ''}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setSelectedServiceId("")}
                                  className="text-xs uppercase tracking-tight text-muted-foreground hover:text-foreground"
                                >
                                  Change service
                                </button>
                              </div>

                              {clientHistoryLoading ? (
                                <div className="h-16 bg-foreground/5 animate-pulse" />
                              ) : matches.length === 0 ? (
                                <div className="text-sm text-muted-foreground">
                                  No previous {selectedService.name.toLowerCase()} visits for this client.
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {matches.map((rec) => (
                                    <button
                                      key={rec.id}
                                      type="button"
                                      onClick={() => loadFormulaRecord(rec)}
                                      className="w-full text-left p-3 border border-foreground/15 hover:border-foreground transition-colors group"
                                    >
                                      <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                          <div className="text-xs text-muted-foreground">{rec.date}</div>
                                          <div className="text-sm text-foreground mt-1 truncate">
                                            {formatComponents(rec)}
                                          </div>
                                        </div>
                                        <div className="text-xs uppercase tracking-tight text-muted-foreground group-hover:text-foreground shrink-0 flex items-center gap-1">
                                          Use again <ChevronRight className="w-3 h-3" />
                                        </div>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={() => setStep('bowls')}
                                className="mt-4 w-full p-4 border border-foreground hover:bg-foreground/5 transition-colors font-display uppercase tracking-tight text-sm"
                              >
                                Continue with fresh bowl
                              </button>
                            </div>
                          );
                        })()}


                        {step === 'bowls' && (
                          <>
                            <MiraVoiceInput
                              products={dbProducts?.map((p) => ({
                                id: p.id,
                                name: p.name,
                                brand: p.brand,
                                line: p.line,
                                shade: p.shade,
                                type: p.type,
                              })) || []}
                              clients={clients?.map((c) => ({ id: c.id, name: c.name })) || []}
                              preferredUnit={preferredUnit}
                              onResult={handleMiraResult}
                            />

                            <div className="space-y-6 mt-6">
                              {existingSessionId && existingBowlCount > 0 && (
                                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                                  Previously saved bowls
                                </div>
                              )}
                              {bowls.map((bowl, index) => (
                                <div key={bowl.id}>
                                  {existingSessionId && index === existingBowlCount && (
                                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2 mt-2 pt-4 border-t border-border">
                                      New bowls
                                    </div>
                                  )}
                                  <BowlCard
                                    bowl={bowl}
                                    index={index}
                                    products={colorProducts}
                                    developerProducts={developerProducts}
                                    onUpdate={(updatedBowl) => updateBowl(index, updatedBowl)}
                                    onDelete={() => deleteBowl(index)}
                                    onAddRemix={() => addRemix(index)}
                                    onUpdateRemix={(rIdx, remix) => updateRemix(index, rIdx, remix)}
                                    onRemoveRemix={(rIdx) => removeRemix(index, rIdx)}
                                    canDelete={bowls.length > 1}
                                    salonSettings={settings}
                                    staffMarkup={effectiveStaff?.markup}
                                    staffBowlFee={effectiveStaff?.bowlFee}
                                    preferredDeveloperLine={getPreferredDeveloperLine(bowl)}
                                    selectedService={selectedService}
                                    allBowls={bowls}
                                    preferredUnit={preferredUnit}
                                    developerDefaultsMap={developerDefaultsMap}
                                    onAutoFillDeveloper={handleAutoFillDeveloper}
                                    salonBowls={salonBowlPresets}
                                  />
                                </div>
                              ))}
                            </div>

                            <Button
                              variant="outline"
                              className="w-full mt-6 gap-2 border-dashed"
                              onClick={addBowl}
                            >
                              <Plus className="w-4 h-4" />
                              Add Another Bowl
                            </Button>

                            {/* Head Sheet section — after bowls + add button */}
                            <section className="mt-6">
                              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">
                                Head Sheet
                              </div>
                              <SessionNotesCard
                                tenantId={tenantId}
                                sessionId={existingSessionId}
                                value={sessionCanvas}
                                previewUrl={sessionCanvasPreviewUrl}
                                onChange={({ data, previewUrl }) => {
                                  setSessionCanvas(data);
                                  setSessionCanvasPreviewUrl(previewUrl);
                                }}
                              />
                            </section>

                            {/* Charge section — its own page-level block */}
                            <section className="mt-10">
                              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">
                                Charge
                              </div>
                              <div className="rounded-2xl bg-muted/30 border border-foreground/10 p-5 sm:p-6">
                                <ChargeSummary
                                  bowls={bowls}
                                  colorProducts={colorProducts}
                                  developerProducts={developerProducts}
                                  settings={settings}
                                  selectedService={selectedService}
                                  staffMarkup={effectiveStaff?.markup}
                                  staffBowlFee={effectiveStaff?.bowlFee}
                                />
                              </div>
                            </section>


                          </>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </main>
              </div>
            );
          })()}

          {/* Sticky glass action bar */}
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-xl border-t border-foreground/15">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                {step !== 'client' && (
                  <Button
                    variant="outline"
                    className="gap-2 rounded-none border-foreground/30"
                    onClick={() => setStep(step === 'bowls' ? 'service' : 'client')}
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </Button>
                )}

                {step === 'client' && (
                  <Button
                    className="rounded-none gap-2 px-6"
                    disabled={!selectedClient}
                    onClick={() => setStep('service')}
                  >
                    Next Step <ChevronRight className="w-4 h-4" />
                  </Button>
                )}

                {step === 'service' && (
                  <Button
                    className="rounded-none gap-2 px-6"
                    onClick={() => setStep('bowls')}
                  >
                    Next Step <ChevronRight className="w-4 h-4" />
                  </Button>
                )}

                {step === 'bowls' && (
                  sessionSaved ? (
                    <>
                      <Button
                        variant="outline"
                        className="gap-2 rounded-none border-dashed"
                        onClick={() => {
                          setBowls(prev => [...prev, createNewBowl(prev.length + 1, preferredUnit)]);
                          setSessionSaved(false);
                        }}
                      >
                        <Plus className="w-4 h-4" /> Add Bowl
                      </Button>
                      <Button
                        className="rounded-none gap-2 px-6"
                        disabled={isLogging}
                        onClick={async () => {
                          const hasNewProducts = bowls.some(bowl =>
                            !originalBowlSnapshots.has(bowl.id) && (
                              bowl.mixItems.some(item => item.product && parseFloat(item.amount) > 0) ||
                              bowl.developers.some(dev => dev.product && parseFloat(dev.amount) > 0)
                            )
                          );
                          const hasModifiedExisting = bowls.some(b => originalBowlSnapshots.has(b.id) && isBowlModified(b));
                          const hasDeletedExisting = deletedExistingBowlIds.length > 0;
                          if (hasNewProducts || hasModifiedExisting || hasDeletedExisting) {
                            await handleLogBowls();
                          }
                          navigate('/');
                        }}
                      >
                        <Home className="w-4 h-4" /> {isLogging ? "Saving..." : "Done"}
                      </Button>
                    </>
                  ) : (
                    <Button
                      className="rounded-none px-6"
                      onClick={handleLogBowls}
                      disabled={isLogging}
                    >
                      {isLogging ? "Saving..." : existingSessionId ? "Add to Session" : "Log All Bowls"}
                    </Button>
                  )
                )}
              </div>
            </div>
            {step === 'bowls' && sessionSaved && (
              <div className="max-w-5xl mx-auto px-4 pb-2 flex items-center justify-center gap-2 text-xs text-primary">
                <CheckCircle2 className="w-4 h-4" />
                <span className="font-medium">Session saved!</span>
              </div>
            )}
          </div>
        </div>
      </PageLayout>

      {/* Maria AI Assistant */}
      <MariaAssistant
        suggestion={mariaSuggestion}
        onAccept={() => {
          toast.success("Maria will remind you next time!");
          setMariaSuggestion(null);
        }}
        onDismiss={() => setMariaSuggestion(null)}
      />

      <AddClientDialog
        open={showAddClient}
        onOpenChange={setShowAddClient}
        defaultName={prefillClientName}
        existingClients={clients?.map(c => ({ name: c.name, email: c.email || null, phone: c.phone || null })) || []}
        onSubmit={async (data) => {
          const result = await createClient.mutateAsync({
            name: data.name,
            email: data.email || null,
            phone: data.phone || null,
            preferences: data.preferences || null,
          });
          setSelectedClient(result.id);
          setStep('service');

        }}
      />
    </div>
  );
}
