import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Beaker, Trash2, Plus, Pencil, Check, Copy, Repeat2, Droplets, Clock, ChevronDown, DollarSign, Scale, CheckCircle2, PlusCircle } from "lucide-react";
import { AddBowlPresetDialog } from "./AddBowlPresetDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ProductCombobox, Product } from "./ProductCombobox";
import { calculateServiceCharge } from "@/lib/utils";
import { SalonSettings } from "@/hooks/useSalonSettings";
import { ServiceMenuItem } from "@/hooks/useServiceMenu";
import { useIsMobile } from "@/hooks/use-mobile";
import { convertToGrams as unitsConvertToGrams, getBottleSizeInGrams as unitsGetBottleSizeInGrams, convertAmountBetweenUnits } from "@/lib/units";

export interface MixItem {
  id: number;
  productType: string; // 'Color' | 'Lightener'
  product: string;
  amount: string;
  unit: string;
}

export interface Developer {
  id: number;
  product: string;
  amount: string;
  unit: string;
}

export interface Remix {
  id: number;
  mixItems: MixItem[];
  developers: Developer[];
  notes?: string;
  // Set after the remix has been persisted (used during session continuation)
  dbBowlId?: string;
}

export interface Bowl {
  id: number;
  name: string;
  mixItems: MixItem[];
  developers: Developer[];
  notes?: string;
  leftoverAmount?: string;
  leftoverUnit?: string;
  // Bowl preset (with known tare weight)
  bowlPresetId?: string | null;
  bowlTareWeight?: number | null;
  bowlTareUnit?: string | null;
  // Raw scale reading after service (bowl + leftover product)
  reweighedAmount?: string;
  reweighedUnit?: string;
  // Stacked formula versions (Remix v2, v3 …) inside this bowl.
  remixes?: Remix[];
}

export interface SalonBowlPreset {
  id: string;
  name: string;
  photo_url: string | null;
  tare_weight: number;
  tare_unit: string;
}


interface StaffMarkupInfo {
  has_custom_markup: boolean;
  custom_markup_percent: number;
}

interface StaffBowlFeeInfo {
  has_custom_bowl_fee: boolean;
  custom_bowl_fee: number;
}

interface BowlCardProps {
  bowl: Bowl;
  index: number;
  products: Product[];
  developerProducts: Product[];
  onUpdate: (bowl: Bowl) => void;
  onDelete: () => void;
  onAddRemix: () => void;
  onUpdateRemix?: (remixIndex: number, remix: Remix) => void;
  onRemoveRemix?: (remixIndex: number) => void;
  canDelete: boolean;
  salonSettings?: SalonSettings | null;
  staffMarkup?: StaffMarkupInfo | null;
  staffBowlFee?: StaffBowlFeeInfo | null;
  preferredDeveloperLine?: { brand: string; line: string } | null;
  selectedService?: ServiceMenuItem | null;
  allBowls?: Bowl[];
  preferredUnit?: string;
  developerDefaultsMap?: Map<string, { brand: string; line: string }>;
  onAutoFillDeveloper?: (bowlId: number, colorProduct: Product) => void;
  salonBowls?: SalonBowlPreset[];
}


// ─── Ratio Memory helpers ────────────────────────────────────────────────────
const RATIO_STORAGE_KEY = "mixr-dev-ratios";

function getStoredRatio(brandLine: string): number | null {
  try {
    const stored = localStorage.getItem(RATIO_STORAGE_KEY);
    if (!stored) return null;
    const map = JSON.parse(stored) as Record<string, number>;
    return map[brandLine] ?? null;
  } catch { return null; }
}

export function storeRatio(brandLine: string, ratio: number) {
  try {
    const stored = localStorage.getItem(RATIO_STORAGE_KEY);
    const map = stored ? JSON.parse(stored) as Record<string, number> : {};
    map[brandLine] = Math.round(ratio * 100) / 100;
    localStorage.setItem(RATIO_STORAGE_KEY, JSON.stringify(map));
  } catch { /* silent */ }
}

export function BowlCard({
  bowl,
  index,
  products,
  developerProducts,
  onUpdate,
  onDelete,
  onAddRemix,
  onUpdateRemix,
  onRemoveRemix,
  canDelete,
  salonSettings,
  staffMarkup,
  staffBowlFee,
  preferredDeveloperLine,
  selectedService,
  allBowls,
  preferredUnit = 'g',
  developerDefaultsMap,
  onAutoFillDeveloper,
  salonBowls = [],
}: BowlCardProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(bowl.name);
  const [isLeftoverExpanded, setIsLeftoverExpanded] = useState(!!bowl.leftoverAmount || !!bowl.reweighedAmount);
  const [addBowlOpen, setAddBowlOpen] = useState(false);
  const isMobile = useIsMobile();
  // Track if developer was auto-filled (for ratio memory)
  const devAutoFilled = useRef(false);

  const selectedPreset = bowl.bowlPresetId ? salonBowls.find(b => b.id === bowl.bowlPresetId) : null;


  // Canonical unit helpers (handles ml/g/oz/L/gal via ml).
  const convertToGrams = unitsConvertToGrams;
  const getBottleSizeInGrams = unitsGetBottleSizeInGrams;

  const totalMixedGrams = useMemo(() => {
    const colorTotal = bowl.mixItems.reduce((sum, item) => {
      if (!item.amount) return sum;
      return sum + convertToGrams(parseFloat(item.amount), item.unit);
    }, 0);
    const devTotal = bowl.developers.reduce((sum, dev) => {
      if (!dev.amount) return sum;
      return sum + convertToGrams(parseFloat(dev.amount), dev.unit);
    }, 0);
    return colorTotal + devTotal;
  }, [bowl.mixItems, bowl.developers]);

  const leftoverGrams = useMemo(() => {
    if (bowl.bowlPresetId && bowl.reweighedAmount) {
      const reweighG = convertToGrams(parseFloat(bowl.reweighedAmount) || 0, bowl.reweighedUnit || 'g');
      const tareG = convertToGrams(Number(bowl.bowlTareWeight) || 0, bowl.bowlTareUnit || 'g');
      return Math.max(0, reweighG - tareG);
    }
    if (bowl.leftoverAmount) {
      return convertToGrams(parseFloat(bowl.leftoverAmount) || 0, bowl.leftoverUnit || 'g');
    }
    return 0;
  }, [bowl.bowlPresetId, bowl.reweighedAmount, bowl.reweighedUnit, bowl.bowlTareWeight, bowl.bowlTareUnit, bowl.leftoverAmount, bowl.leftoverUnit]);

  const amountUsedGrams = useMemo(() => {
    if (!bowl.leftoverAmount && !bowl.reweighedAmount) return totalMixedGrams;
    return Math.max(0, totalMixedGrams - leftoverGrams);
  }, [totalMixedGrams, leftoverGrams, bowl.leftoverAmount, bowl.reweighedAmount]);


  const convertBetweenUnits = convertAmountBetweenUnits;

  const allBowlsTotals = useMemo(() => {
    const bowlsToSum = allBowls || [bowl];
    let totalColorAmount = 0;
    let totalDevAmount = 0;
    const serviceColorUnit = selectedService?.color_unit || 'oz';
    const serviceDevUnit = selectedService?.developer_unit || 'oz';

    for (const b of bowlsToSum) {
      for (const item of b.mixItems) {
        if (!item.product || !item.amount) continue;
        totalColorAmount += convertBetweenUnits(parseFloat(item.amount), item.unit, serviceColorUnit);
      }
      for (const dev of b.developers) {
        if (!dev.product || !dev.amount) continue;
        totalDevAmount += convertBetweenUnits(parseFloat(dev.amount), dev.unit, serviceDevUnit);
      }
    }
    return { totalColorAmount, totalDevAmount, serviceColorUnit, serviceDevUnit };
  }, [allBowls, bowl, selectedService]);

  const { productCost, chargeAmount, overageInfo } = useMemo(() => {
    const colorCost = bowl.mixItems.reduce((sum, item) => {
      if (!item.product || !item.amount) return sum;
      const product = products.find(p => p.id === item.product);
      if (!product?.cost || !product?.size) return sum;
      const bottleSizeInGrams = getBottleSizeInGrams(product.size, product.sizeUnit || 'ml');
      const costPerGram = product.cost / bottleSizeInGrams;
      const amountInGrams = convertToGrams(parseFloat(item.amount), item.unit);
      return sum + (costPerGram * amountInGrams);
    }, 0);

    let devCost = 0;
    for (const dev of bowl.developers) {
      if (!dev.product || !dev.amount) continue;
      const devProduct = developerProducts.find(p => p.id === dev.product);
      if (!devProduct?.cost || !devProduct?.size) continue;
      const bottleSizeInGrams = getBottleSizeInGrams(devProduct.size, devProduct.sizeUnit || 'ml');
      const costPerGram = devProduct.cost / bottleSizeInGrams;
      const amountInGrams = convertToGrams(parseFloat(dev.amount), dev.unit);
      devCost += costPerGram * amountInGrams;
    }

    const totalProductCost = colorCost + devCost;
    const backbarMultiplier = (staffMarkup?.has_custom_markup && staffMarkup.custom_markup_percent > 0)
      ? staffMarkup.custom_markup_percent
      : (salonSettings?.backbar_multiplier ?? 4);
    const effectiveBowlFee = (staffBowlFee?.has_custom_bowl_fee)
      ? staffBowlFee.custom_bowl_fee
      : (salonSettings?.bowl_fee ?? 0);

    if (selectedService && salonSettings) {
      const { totalColorAmount, totalDevAmount, serviceColorUnit, serviceDevUnit } = allBowlsTotals;
      const colorOverage = Math.max(0, totalColorAmount - selectedService.color_amount);
      const devOverage = Math.max(0, totalDevAmount - selectedService.developer_amount);

      const totalAllotmentRatio = selectedService.color_amount > 0 && totalColorAmount > 0
        ? Math.min(1, selectedService.color_amount / totalColorAmount)
        : 0;
      const devAllotmentRatio = selectedService.developer_amount > 0 && totalDevAmount > 0
        ? Math.min(1, selectedService.developer_amount / totalDevAmount)
        : 0;
      
      const colorOverageCost = colorCost * Math.max(0, 1 - totalAllotmentRatio);
      const devOverageCost = devCost * Math.max(0, 1 - devAllotmentRatio);
      const totalOverageCost = colorOverageCost + devOverageCost;

      const charge = totalOverageCost > 0
        ? calculateServiceCharge(
            totalOverageCost,
            backbarMultiplier,
            salonSettings.waste_factor_percent,
            effectiveBowlFee,
            salonSettings.rounding_amount
          )
        : 0;

      const withinAllotment = colorOverage === 0 && devOverage === 0;
      const withinAllotmentCharge = selectedService.price + effectiveBowlFee;

      return {
        productCost: totalProductCost,
        chargeAmount: withinAllotment ? withinAllotmentCharge : charge,
        overageInfo: {
          colorOverage,
          devOverage,
          serviceColorUnit,
          serviceDevUnit,
          withinAllotment,
          servicePrice: selectedService.price,
          bowlFee: effectiveBowlFee,
          withinAllotmentCharge,
        },
      };
    }


    const charge = salonSettings
      ? calculateServiceCharge(
          totalProductCost,
          backbarMultiplier,
          salonSettings.waste_factor_percent,
          effectiveBowlFee,
          salonSettings.rounding_amount
        )
      : 0;

    return { productCost: totalProductCost, chargeAmount: charge, overageInfo: null };
  }, [bowl.mixItems, bowl.developers, products, developerProducts, salonSettings, staffMarkup, staffBowlFee, selectedService, allBowlsTotals]);

  const updateLeftover = (leftover: string) => {
    onUpdate({ ...bowl, leftoverAmount: leftover });
  };

  const updateProcessingTime = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, "");
    onUpdate({ ...bowl, notes: cleaned });
  };

  const addMixItem = () => {
      onUpdate({
      ...bowl,
      mixItems: [...bowl.mixItems, { id: Date.now(), productType: "Color", product: "", amount: "", unit: preferredUnit }],
    });
  };

  const removeMixItem = (id: number) => {
    if (bowl.mixItems.length > 1) {
      onUpdate({
        ...bowl,
        mixItems: bowl.mixItems.filter((item) => item.id !== id),
      });
    }
  };

  const updateMixItem = (id: number, field: keyof MixItem, value: string) => {
    const updatedMixItems = bowl.mixItems.map((item) => {
      if (item.id !== id) return item;
      if (field === 'productType' && value !== item.productType) {
        return { ...item, productType: value, product: "" };
      }
      return { ...item, [field]: value };
    });

    const updatedBowl = { ...bowl, mixItems: updatedMixItems };
    onUpdate(updatedBowl);

    // Auto-fill developer when a color product is selected and developer is empty
    if (field === "product" && value && onAutoFillDeveloper) {
      const firstDevEmpty = bowl.developers.length > 0 && !bowl.developers[0].product;
      if (firstDevEmpty) {
        const selectedProduct = products.find(p => p.id === value);
        if (selectedProduct) {
          onAutoFillDeveloper(bowl.id, selectedProduct);
          devAutoFilled.current = true;
        }
      }
    }

    // Ratio memory: auto-calc developer amount when color amount changes
    if (field === "amount" && value && devAutoFilled.current) {
      const item = bowl.mixItems.find(i => i.id === id);
      if (item?.product) {
        const colorProduct = products.find(p => p.id === item.product);
        if (colorProduct) {
          const brandLine = `${colorProduct.brand}|${colorProduct.productLine}`;
          const ratio = getStoredRatio(brandLine);
          if (ratio !== null && ratio > 0) {
            const colorAmount = parseFloat(value);
            if (colorAmount > 0 && bowl.developers[0]?.product) {
              const devAmount = (colorAmount * ratio).toFixed(1);
              // Only auto-fill if dev amount is still empty or was auto-calculated
              if (!bowl.developers[0].amount || bowl.developers[0].amount === "0") {
                const updatedDevs = bowl.developers.map((dev, i) =>
                  i === 0 ? { ...dev, amount: devAmount } : dev
                );
                onUpdate({ ...updatedBowl, developers: updatedDevs });
              }
            }
          }
        }
      }
    }
  };

  const addDeveloper = () => {
    onUpdate({
      ...bowl,
      developers: [...bowl.developers, { id: Date.now(), product: "", amount: "", unit: preferredUnit }],
    });
  };

  const removeDeveloper = (id: number) => {
    if (bowl.developers.length > 1) {
      onUpdate({
        ...bowl,
        developers: bowl.developers.filter((dev) => dev.id !== id),
      });
    }
  };

  const updateDeveloper = (id: number, field: keyof Omit<Developer, 'id'>, value: string) => {
    onUpdate({
      ...bowl,
      developers: bowl.developers.map((dev) =>
        dev.id === id ? { ...dev, [field]: value } : dev
      ),
    });
  };

  const saveName = () => {
    onUpdate({ ...bowl, name: editedName || `Bowl ${index + 1}` });
    setIsEditingName(false);
  };

  // Determine if we should show unit selector (hide if salon only uses one unit)
  const showUnitSelector = !isMobile;

  return (
    <motion.div
      className="stat-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
            <Beaker className="w-5 h-5 text-muted-foreground" />
          </div>
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="h-8 w-40"
                autoFocus
                onBlur={saveName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveName();
                  else if (e.key === "Escape") {
                    setEditedName(bowl.name);
                    setIsEditingName(false);
                  }
                }}
              />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={saveName}>
                <Check className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-foreground">{bowl.name}</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground"
                onClick={() => {
                  setEditedName(bowl.name);
                  setIsEditingName(true);
                }}
              >
                <Pencil className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="secondary"
            size="sm"
            className="h-9 gap-1.5 px-3 border border-border"
            onClick={onAddRemix}
            title="Remix this bowl — adds another formula version under it"
          >
            <Repeat2 className="w-4 h-4" />
            <span className="text-sm font-medium">Remix</span>
          </Button>
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
              title="Delete bowl"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>


      <AddBowlPresetDialog
        open={addBowlOpen}
        onOpenChange={setAddBowlOpen}
        defaultUnit={preferredUnit}
        onCreated={(sb) => {
          onUpdate({
            ...bowl,
            bowlPresetId: sb.id,
            bowlTareWeight: sb.tare_weight,
            bowlTareUnit: sb.tare_unit,
          });
        }}
      />




      {/* Formula Section */}
      <div className="mb-6">
        <Label className="text-sm font-medium text-muted-foreground mb-3 block">
          Color Formula
        </Label>
        <div className="space-y-3">
          {bowl.mixItems.map((item, itemIndex) => (
            <motion.div
              key={item.id}
              className={isMobile ? "space-y-2" : "flex items-end gap-3"}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: itemIndex * 0.05 }}
            >
              {/* Row 1 on mobile: type toggle + product */}
              <div className={isMobile ? "flex items-end gap-2" : "contents"}>
                {/* Type selector — compact toggle on mobile, dropdown on desktop */}
                {isMobile ? (
                  <ToggleGroup
                    type="single"
                    value={item.productType || "Color"}
                    onValueChange={(v) => v && updateMixItem(item.id, "productType", v)}
                    className="shrink-0"
                  >
                    <ToggleGroupItem value="Color" className="text-xs px-2 h-10 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                      Color
                    </ToggleGroupItem>
                    <ToggleGroupItem value="Lightener" className="text-xs px-2 h-10 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                      Light
                    </ToggleGroupItem>
                  </ToggleGroup>
                ) : (
                  <div className="w-28">
                    <Select
                      value={item.productType || "Color"}
                      onValueChange={(v) => updateMixItem(item.id, "productType", v)}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Color">Color</SelectItem>
                        <SelectItem value="Lightener">Lightener</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <ProductCombobox
                    products={products.filter(p => p.type === (item.productType || "Color"))}
                    value={item.product}
                    onValueChange={(v) => updateMixItem(item.id, "product", v)}
                    onAddNew={() => console.log("Add new product")}
                  />
                </div>
              </div>

              {/* Row 2 on mobile: amount + unit + delete */}
              <div className={isMobile ? "flex items-end gap-2 pl-1" : "contents"}>
                <div className={isMobile ? "w-24" : "w-20"}>
                  <Input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={item.amount}
                    onChange={(e) => updateMixItem(item.id, "amount", e.target.value)}
                  />
                </div>

                {showUnitSelector ? (
                  <div className="w-20">
                    <Select
                      value={item.unit}
                      onValueChange={(v) => updateMixItem(item.id, "unit", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="g">g</SelectItem>
                        <SelectItem value="oz">oz</SelectItem>
                        <SelectItem value="ml">ml</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground self-center pb-2 font-medium">{item.unit}</span>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => removeMixItem(item.id)}
                  disabled={bowl.mixItems.length === 1}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        <Button variant="outline" className="w-full mt-3 gap-2" onClick={addMixItem}>
          <Plus className="w-4 h-4" />
          Add Product
        </Button>
      </div>

      {/* Developer Section */}
      <div className="pt-4 border-t border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-muted-foreground" />
            <Label className="text-sm font-medium text-muted-foreground">Developer</Label>
          </div>
        </div>
        <div className="space-y-3">
          {bowl.developers.map((dev, devIndex) => (
            <motion.div
              key={dev.id}
              className={isMobile ? "space-y-2" : "flex items-end gap-3"}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: devIndex * 0.05 }}
            >
              <div className={isMobile ? "w-full" : "flex-1"}>
                <ProductCombobox
                  products={
                    preferredDeveloperLine
                      ? [...developerProducts].sort((a, b) => {
                          const aIsPref = a.brand === preferredDeveloperLine.brand && a.productLine === preferredDeveloperLine.line;
                          const bIsPref = b.brand === preferredDeveloperLine.brand && b.productLine === preferredDeveloperLine.line;
                          if (aIsPref && !bIsPref) return -1;
                          if (!aIsPref && bIsPref) return 1;
                          return 0;
                        })
                      : developerProducts
                  }
                  value={dev.product}
                  onValueChange={(v) => updateDeveloper(dev.id, "product", v)}
                />
              </div>

              <div className={isMobile ? "flex items-end gap-2 pl-1" : "contents"}>
                <div className={isMobile ? "w-24" : "w-20"}>
                  <Input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={dev.amount}
                    onChange={(e) => updateDeveloper(dev.id, "amount", e.target.value)}
                  />
                </div>

                {showUnitSelector ? (
                  <div className="w-20">
                    <Select
                      value={dev.unit}
                      onValueChange={(v) => updateDeveloper(dev.id, "unit", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ml">ml</SelectItem>
                        <SelectItem value="oz">oz</SelectItem>
                        <SelectItem value="g">g</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground self-center pb-2 font-medium">{dev.unit}</span>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => removeDeveloper(dev.id)}
                  disabled={bowl.developers.length === 1}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        <Button variant="outline" className="w-full mt-3 gap-2" onClick={addDeveloper}>
          <Plus className="w-4 h-4" />
          Add Developer
        </Button>
      </div>

      {/* Processing Time Section */}
      <div className="pt-4 border-t border-border mt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <Label className="text-sm font-medium text-muted-foreground">
              Processing Time
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={bowl.notes && /^\d+$/.test(bowl.notes) ? bowl.notes : ""}
              onChange={(e) => updateProcessingTime(e.target.value)}
              placeholder="0"
              className="w-20 h-9 text-right focus-visible:ring-inset"
            />
            <span className="text-sm text-muted-foreground">min</span>
          </div>
        </div>
      </div>


      {/* Re-weigh Leftover Section */}
      <div className="pt-4 border-t border-border mt-4">
        <button
          type="button"
          onClick={() => setIsLeftoverExpanded(!isLeftoverExpanded)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-muted-foreground" />
            <Label className="text-sm font-medium text-muted-foreground cursor-pointer">
              Re-weigh Leftover
            </Label>
            {selectedPreset && bowl.reweighedAmount && !isLeftoverExpanded && (
              <span className="text-xs text-muted-foreground/70">
                — {bowl.reweighedAmount}{bowl.reweighedUnit || preferredUnit} on scale
              </span>
            )}
            {!selectedPreset && bowl.leftoverAmount && !isLeftoverExpanded && (
              <span className="text-xs text-muted-foreground/70">
                — {bowl.leftoverAmount}{bowl.leftoverUnit || preferredUnit} leftover
              </span>
            )}
          </div>
          <ChevronDown 
            className={`w-4 h-4 text-muted-foreground transition-transform ${isLeftoverExpanded ? 'rotate-180' : ''}`}
          />
        </button>
        
        <AnimatePresence>
          {isLeftoverExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mt-3 space-y-3">
                {/* Bowl preset picker — only relevant when re-weighing to subtract tare */}
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                    Bowl Used
                  </Label>
                  <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                    <button
                      type="button"
                      onClick={() => onUpdate({ ...bowl, bowlPresetId: null, bowlTareWeight: null, bowlTareUnit: null })}
                      className={`shrink-0 flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-colors w-20 ${
                        !bowl.bowlPresetId ? 'border-primary bg-primary/5' : 'border-border bg-secondary/40 hover:border-primary/50'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-md bg-background border border-border flex items-center justify-center">
                        <span className="text-[10px] text-muted-foreground">None</span>
                      </div>
                      <span className="text-[11px] text-foreground truncate w-full text-center">No bowl</span>
                    </button>
                    {salonBowls.map((sb) => {
                      const active = bowl.bowlPresetId === sb.id;
                      return (
                        <button
                          key={sb.id}
                          type="button"
                          onClick={() => onUpdate({
                            ...bowl,
                            bowlPresetId: sb.id,
                            bowlTareWeight: sb.tare_weight,
                            bowlTareUnit: sb.tare_unit,
                          })}
                          className={`shrink-0 flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-colors w-20 ${
                            active ? 'border-primary bg-primary/5' : 'border-border bg-secondary/40 hover:border-primary/50'
                          }`}
                          title={`${sb.name} — tare ${sb.tare_weight}${sb.tare_unit}`}
                        >
                          <div className="w-12 h-12 rounded-md bg-background border border-border overflow-hidden flex items-center justify-center">
                            {sb.photo_url ? (
                              <img src={sb.photo_url} alt={sb.name} className="w-full h-full object-cover" />
                            ) : (
                              <Scale className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <span className="text-[11px] text-foreground truncate w-full text-center">{sb.name}</span>
                          <span className="text-[10px] text-muted-foreground">{sb.tare_weight}{sb.tare_unit}</span>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setAddBowlOpen(true)}
                      className="shrink-0 flex flex-col items-center gap-1 p-2 rounded-lg border-2 border-dashed border-border bg-background hover:border-primary hover:bg-primary/5 transition-colors w-20"
                    >
                      <div className="w-12 h-12 rounded-md bg-secondary/40 border border-border flex items-center justify-center">
                        <PlusCircle className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <span className="text-[11px] text-foreground truncate w-full text-center">Add bowl</span>
                    </button>
                  </div>
                  {salonBowls.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Save a bowl with its empty weight so leftover product is calculated automatically.
                    </p>
                  )}
                </div>

                {selectedPreset ? (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Put the bowl back on the scale and enter the total reading. We'll subtract the bowl's weight ({selectedPreset.tare_weight}{selectedPreset.tare_unit}) automatically.
                    </p>
                    <div className="flex items-center gap-3">
                      <Label className="text-sm text-muted-foreground whitespace-nowrap">Scale reads:</Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        placeholder="0"
                        value={bowl.reweighedAmount || ""}
                        onChange={(e) => onUpdate({ ...bowl, reweighedAmount: e.target.value })}
                        className="w-24"
                      />
                      <Select
                        value={bowl.reweighedUnit || selectedPreset.tare_unit || preferredUnit}
                        onValueChange={(v) => onUpdate({ ...bowl, reweighedUnit: v })}
                      >
                        <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="g">g</SelectItem>
                          <SelectItem value="oz">oz</SelectItem>
                          <SelectItem value="ml">ml</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      After your service, weigh any leftover product to track actual usage.
                    </p>
                    <div className="flex items-center gap-3">
                      <Label className="text-sm text-muted-foreground whitespace-nowrap">Leftover:</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={bowl.leftoverAmount || ""}
                        onChange={(e) => updateLeftover(e.target.value)}
                        className="w-24"
                      />
                      <Select
                        value={bowl.leftoverUnit || preferredUnit}
                        onValueChange={(v) => onUpdate({ ...bowl, leftoverUnit: v })}
                      >
                        <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="g">g</SelectItem>
                          <SelectItem value="oz">oz</SelectItem>
                          <SelectItem value="ml">ml</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                
                {totalMixedGrams > 0 && (
                  <div className="flex flex-wrap items-center gap-2 text-xs bg-secondary/50 rounded-md px-3 py-2">
                    <span className="text-muted-foreground">Mixed: <strong className="text-foreground">{convertBetweenUnits(totalMixedGrams, 'g', preferredUnit).toFixed(0)}{preferredUnit}</strong></span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-muted-foreground">Used: <strong className="text-foreground">{convertBetweenUnits(amountUsedGrams, 'g', preferredUnit).toFixed(0)}{preferredUnit}</strong></span>
                    {leftoverGrams > 0 && (
                      <>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-muted-foreground">Leftover: <strong className="text-foreground">{convertBetweenUnits(leftoverGrams, 'g', preferredUnit).toFixed(0)}{preferredUnit}</strong></span>
                      </>
                    )}
                  </div>
                )}
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Remix Versions */}
      {(bowl.remixes && bowl.remixes.length > 0) && (
        <div className="mt-6 space-y-4">
          {bowl.remixes.map((remix, rIdx) => (
            <RemixSection
              key={remix.id}
              remix={remix}
              versionLabel={`Remix v${rIdx + 2}`}
              products={products}
              developerProducts={developerProducts}
              preferredUnit={preferredUnit}
              preferredDeveloperLine={preferredDeveloperLine}
              isMobile={isMobile}
              showUnitSelector={showUnitSelector}
              onUpdate={(updated) => onUpdateRemix?.(rIdx, updated)}
              onRemove={() => onRemoveRemix?.(rIdx)}
            />
          ))}
        </div>
      )}

    </motion.div>

  );
}

// ─── Remix Section ───────────────────────────────────────────────────────────
// Renders a stacked formula version (Remix v2, v3 …) inside a parent BowlCard.
function RemixSection({
  remix,
  versionLabel,
  products,
  developerProducts,
  preferredUnit,
  preferredDeveloperLine,
  isMobile,
  showUnitSelector,
  onUpdate,
  onRemove,
}: {
  remix: Remix;
  versionLabel: string;
  products: Product[];
  developerProducts: Product[];
  preferredUnit: string;
  preferredDeveloperLine?: { brand: string; line: string } | null;
  isMobile: boolean;
  showUnitSelector: boolean;
  onUpdate: (remix: Remix) => void;
  onRemove: () => void;
}) {
  const addMixItem = () =>
    onUpdate({
      ...remix,
      mixItems: [
        ...remix.mixItems,
        { id: Date.now(), productType: "Color", product: "", amount: "", unit: preferredUnit },
      ],
    });

  const removeMixItem = (id: number) => {
    if (remix.mixItems.length > 1) {
      onUpdate({ ...remix, mixItems: remix.mixItems.filter((i) => i.id !== id) });
    }
  };

  const updateMixItem = (id: number, field: keyof MixItem, value: string) => {
    onUpdate({
      ...remix,
      mixItems: remix.mixItems.map((item) => {
        if (item.id !== id) return item;
        if (field === "productType" && value !== item.productType) {
          return { ...item, productType: value, product: "" };
        }
        return { ...item, [field]: value };
      }),
    });
  };

  const addDeveloper = () =>
    onUpdate({
      ...remix,
      developers: [
        ...remix.developers,
        { id: Date.now(), product: "", amount: "", unit: preferredUnit },
      ],
    });

  const removeDeveloper = (id: number) => {
    if (remix.developers.length > 1) {
      onUpdate({ ...remix, developers: remix.developers.filter((d) => d.id !== id) });
    }
  };

  const updateDeveloper = (id: number, field: keyof Omit<Developer, "id">, value: string) => {
    onUpdate({
      ...remix,
      developers: remix.developers.map((d) => (d.id === id ? { ...d, [field]: value } : d)),
    });
  };

  return (
    <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Repeat2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">{versionLabel}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          title="Remove this remix"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Formula */}
      <div className="mb-4">
        <Label className="text-xs font-medium text-muted-foreground mb-2 block">Color Formula</Label>
        <div className="space-y-3">
          {remix.mixItems.map((item) => (
            <div key={item.id} className={isMobile ? "space-y-2" : "flex items-end gap-3"}>
              <div className={isMobile ? "flex items-end gap-2" : "contents"}>
                {isMobile ? (
                  <ToggleGroup
                    type="single"
                    value={item.productType || "Color"}
                    onValueChange={(v) => v && updateMixItem(item.id, "productType", v)}
                    className="shrink-0"
                  >
                    <ToggleGroupItem value="Color" className="text-xs px-2 h-10 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">Color</ToggleGroupItem>
                    <ToggleGroupItem value="Lightener" className="text-xs px-2 h-10 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">Light</ToggleGroupItem>
                  </ToggleGroup>
                ) : (
                  <div className="w-28">
                    <Select value={item.productType || "Color"} onValueChange={(v) => updateMixItem(item.id, "productType", v)}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Color">Color</SelectItem>
                        <SelectItem value="Lightener">Lightener</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <ProductCombobox
                    products={products.filter((p) => p.type === (item.productType || "Color"))}
                    value={item.product}
                    onValueChange={(v) => updateMixItem(item.id, "product", v)}
                  />
                </div>
              </div>

              <div className={isMobile ? "flex items-end gap-2 pl-1" : "contents"}>
                <div className={isMobile ? "w-24" : "w-20"}>
                  <Input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={item.amount}
                    onChange={(e) => updateMixItem(item.id, "amount", e.target.value)}
                  />
                </div>
                {showUnitSelector ? (
                  <div className="w-20">
                    <Select value={item.unit} onValueChange={(v) => updateMixItem(item.id, "unit", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="g">g</SelectItem>
                        <SelectItem value="oz">oz</SelectItem>
                        <SelectItem value="ml">ml</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground self-center pb-2 font-medium">{item.unit}</span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => removeMixItem(item.id)}
                  disabled={remix.mixItems.length === 1}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" className="w-full mt-3 gap-2" onClick={addMixItem}>
          <Plus className="w-4 h-4" />
          Add Product
        </Button>
      </div>

      {/* Developer */}
      <div className="pt-3 border-t border-border/60">
        <div className="flex items-center gap-2 mb-3">
          <Droplets className="w-4 h-4 text-muted-foreground" />
          <Label className="text-xs font-medium text-muted-foreground">Developer</Label>
        </div>
        <div className="space-y-3">
          {remix.developers.map((dev) => (
            <div key={dev.id} className={isMobile ? "space-y-2" : "flex items-end gap-3"}>
              <div className={isMobile ? "w-full" : "flex-1"}>
                <ProductCombobox
                  products={
                    preferredDeveloperLine
                      ? [...developerProducts].sort((a, b) => {
                          const aP = a.brand === preferredDeveloperLine.brand && a.productLine === preferredDeveloperLine.line;
                          const bP = b.brand === preferredDeveloperLine.brand && b.productLine === preferredDeveloperLine.line;
                          if (aP && !bP) return -1;
                          if (!aP && bP) return 1;
                          return 0;
                        })
                      : developerProducts
                  }
                  value={dev.product}
                  onValueChange={(v) => updateDeveloper(dev.id, "product", v)}
                />
              </div>
              <div className={isMobile ? "flex items-end gap-2 pl-1" : "contents"}>
                <div className={isMobile ? "w-24" : "w-20"}>
                  <Input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={dev.amount}
                    onChange={(e) => updateDeveloper(dev.id, "amount", e.target.value)}
                  />
                </div>
                {showUnitSelector ? (
                  <div className="w-20">
                    <Select value={dev.unit} onValueChange={(v) => updateDeveloper(dev.id, "unit", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ml">ml</SelectItem>
                        <SelectItem value="oz">oz</SelectItem>
                        <SelectItem value="g">g</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground self-center pb-2 font-medium">{dev.unit}</span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => removeDeveloper(dev.id)}
                  disabled={remix.developers.length === 1}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" className="w-full mt-3 gap-2" onClick={addDeveloper}>
          <Plus className="w-4 h-4" />
          Add Developer
        </Button>
      </div>
    </div>
  );
}
