import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, User, RotateCcw, FlaskConical, ChevronDown, ChevronUp, Pencil, Trash2, Check, X, Scale, Play, DollarSign, Beaker, Receipt, Loader2 } from "lucide-react";
import { useEffectiveStaff } from "@/hooks/useEffectiveStaff";
import { useSessionFinancials } from "@/hooks/useSessionFinancials";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { calculateServiceCharge } from "@/lib/utils";
import { convertToGrams, convertGramsToDisplayUnit } from "@/lib/unitConversion";
import { Badge } from "@/components/ui/badge";
import type { SalonSettings } from "@/hooks/useSalonSettings";
import type { ServiceMenuItem } from "@/hooks/useServiceMenu";
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

export type { FormulaComponent, FormulaRecord, BowlRecord } from "@/hooks/useClients";
import type { FormulaComponent, FormulaRecord, BowlRecord } from "@/hooks/useClients";

interface FormulaHistoryCardProps {
  record: FormulaRecord;
  index: number;
  onUseAgain?: (record: FormulaRecord) => void;
  onUseOptimized?: (record: FormulaRecord, optimizedComponents: FormulaComponent[], optimizedDeveloper: { productId: string; name: string; amount: number; unit?: string } | null) => void;
  canEditFormulas?: boolean;
  canDeleteSessions?: boolean;
  onEditNotes?: (sessionId: string, notes: string) => void;
  onDeleteSession?: (sessionId: string) => void;
  onReweigh?: (sessionId: string, leftoverAmount: number, leftoverUnit: string) => void;
  onReweighBowl?: (sessionId: string, bowlId: string, leftoverAmount: number, leftoverUnit: string) => void;
  wasteTargetPercent?: number;
  onContinueSession?: (record: FormulaRecord) => void;
  salonSettings?: SalonSettings | null;
  services?: ServiceMenuItem[];
}

function formatFormula(record: FormulaRecord): string {
  if (!record.components || record.components.length === 0) {
    return record.formula;
  }
  
  const unit = record.unit || 'g';
  const colorParts = record.components.map(c => `${c.productName} (${c.amount}${c.unit || unit})`).join(' + ');
  
  if (record.developer) {
    return `${colorParts} + ${record.developer.name} (${record.developer.amount}${unit})`;
  }
  
  return colorParts;
}

interface OptimizedBowl {
  bowlId: string;
  name: string;
  components: FormulaComponent[];
  developer: { productId: string; name: string; amount: number; unit?: string } | null;
  changed: boolean;
}

interface OptimizedResult {
  bowls: OptimizedBowl[];
  // Flat lists for backward compat / callback
  components: FormulaComponent[];
  developer: { productId: string; name: string; amount: number; unit?: string } | null;
  savings: number;
}

function optimizeBowlComponents(
  components: FormulaComponent[],
  developer: { productId: string; name: string; amount: number; unit?: string } | undefined,
  ratio: number,
  unit: string,
): { components: FormulaComponent[]; developer: { productId: string; name: string; amount: number; unit?: string } | null } {
  // Components/developer may each be recorded in a different unit (oz vs g),
  // so all proportion/rounding math is done in grams, then converted back to
  // each item's own original unit for the output.
  const stepG = unit === 'oz' ? convertToGrams(0.25, 'oz') : 5;
  const roundToStep = (n: number) => Math.round(n / stepG) * stepG;
  const floorToStep = (n: number) => Math.floor(n / stepG) * stepG;

  const componentUnits = components.map(c => c.unit || unit);
  const originalAmountsG = components.map((c, i) => convertToGrams(c.amount, componentUnits[i]));
  const originalTotalG = originalAmountsG.reduce((s, a) => s + a, 0);
  const scaledTotalG = originalTotalG * ratio;
  const roundedTotalG = Math.max(stepG, roundToStep(scaledTotalG));

  const idealAmountsG = originalAmountsG.map(a =>
    (originalTotalG > 0 ? a / originalTotalG : 0) * roundedTotalG
  );
  const flooredG = idealAmountsG.map(a => Math.max(stepG, floorToStep(a)));
  let remainderG = roundToStep(roundedTotalG - flooredG.reduce((s, a) => s + a, 0));

  const fractions = idealAmountsG.map((a, i) => ({ i, frac: a - flooredG[i] }));
  fractions.sort((a, b) => b.frac - a.frac);
  for (const f of fractions) {
    if (remainderG <= 0) break;
    flooredG[f.i] += stepG;
    remainderG -= stepG;
  }

  const optComponents = components.map((c, i) => {
    const compUnit = componentUnits[i];
    const flooredInCompUnit = convertGramsToDisplayUnit(flooredG[i], compUnit);
    return {
      productId: c.productId,
      productName: c.productName,
      amount: Math.min(flooredInCompUnit, c.amount),
      unit: c.unit,
    };
  });

  const devUnit = developer?.unit || unit;
  const optDeveloper = developer ? {
    productId: developer.productId,
    name: developer.name,
    amount: Math.min(
      convertGramsToDisplayUnit(Math.max(stepG, roundToStep(convertToGrams(developer.amount, devUnit) * ratio)), devUnit),
      developer.amount
    ),
    unit: developer.unit,
  } : null;

  return { components: optComponents, developer: optDeveloper };
}

function calculateOptimizedAmounts(record: FormulaRecord): OptimizedResult | null {
  const unit = record.unit || 'g';

  // Bowl-aware path: iterate each bowl independently
  if (record.bowls && record.bowls.length > 0) {
    const optimizedBowls: OptimizedBowl[] = record.bowls.map(bowl => {
      const hasReweighData = bowl.amountMixed && bowl.amountMixed > 0
        && bowl.amountUsed != null && bowl.amountUsed > 0
        && bowl.amountUsed < bowl.amountMixed;

      if (!hasReweighData || bowl.components.length === 0) {
        // No waste or no components — keep original amounts
        return {
          bowlId: bowl.bowlId,
          name: bowl.name,
          components: bowl.components.map(c => ({ productId: c.productId, productName: c.productName, amount: c.amount, unit: c.unit })),
          developer: bowl.developer ? { productId: bowl.developer.productId, name: bowl.developer.name, amount: bowl.developer.amount, unit: bowl.developer.unit } : null,
          changed: false,
        };
      }

      const ratio = bowl.amountUsed! / bowl.amountMixed!;
      const { components: optC, developer: optD } = optimizeBowlComponents(bowl.components, bowl.developer, ratio, unit);
      return {
        bowlId: bowl.bowlId,
        name: bowl.name,
        components: optC,
        developer: optD,
        changed: true,
      };
    });

    // Check if any bowl actually changed
    if (!optimizedBowls.some(b => b.changed)) return null;

    // Flatten for callback
    const flatComponents = optimizedBowls.flatMap(b => b.components);
    // Pick the first developer found (same behavior as before)
    const flatDeveloper = optimizedBowls.find(b => b.developer)?.developer || null;

    const componentsG = (comps: FormulaComponent[]) =>
      comps.reduce((s, c) => s + convertToGrams(c.amount, c.unit || unit), 0);
    const developerG = (dev: { amount: number; unit?: string } | null | undefined) =>
      dev ? convertToGrams(dev.amount, dev.unit || unit) : 0;

    const originalTotal = record.bowls.reduce((sum, b) => {
      return sum + componentsG(b.components) + developerG(b.developer);
    }, 0);
    const optimizedTotal = optimizedBowls.reduce((sum, b) => {
      return sum + componentsG(b.components) + developerG(b.developer);
    }, 0);

    return {
      bowls: optimizedBowls,
      components: flatComponents,
      developer: flatDeveloper,
      savings: Math.round((originalTotal - optimizedTotal) * 10) / 10,
    };
  }

  // Fallback: flat component list (legacy single-bowl)
  if (!record.components || !record.amountMixed || !record.amountUsed) return null;

  const ratio = record.amountUsed / record.amountMixed;
  const { components: optC, developer: optD } = optimizeBowlComponents(record.components, record.developer, ratio, unit);

  const optimizedTotal = optC.reduce((sum, c) => sum + convertToGrams(c.amount, c.unit || unit), 0)
    + (optD ? convertToGrams(optD.amount, optD.unit || unit) : 0);

  return {
    bowls: [{
      bowlId: 'legacy',
      name: 'Bowl 1',
      components: optC,
      developer: optD,
      changed: true,
    }],
    components: optC,
    developer: optD,
    savings: Math.round((record.amountMixed - optimizedTotal) * 10) / 10,
  };
}

export function FormulaHistoryCard({ record, index, onUseAgain, onUseOptimized, canEditFormulas, canDeleteSessions, onEditNotes, onDeleteSession, onReweigh, onReweighBowl, wasteTargetPercent = 5, onContinueSession, salonSettings, services }: FormulaHistoryCardProps) {
  const [showReformulate, setShowReformulate] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState("");
  const [showReweigh, setShowReweigh] = useState(false);
  const [leftoverAmount, setLeftoverAmount] = useState("");
  const [leftoverUnit, setLeftoverUnit] = useState<string>("g");
  const [showCharge, setShowCharge] = useState(false);
  const [selectedBowlId, setSelectedBowlId] = useState<string | null>(null);

  const isMultiBowl = record.bowls && record.bowls.length > 1;

  // Check if session is within 12 hours of creation
  const isWithin12Hours = record.createdAt
    ? (Date.now() - new Date(record.createdAt).getTime()) < 12 * 60 * 60 * 1000
    : false;
  
  const hasReweigh = record.amountMixed && record.amountMixed > 0 && record.amountUsed && record.amountUsed > 0 && record.amountUsed !== record.amountMixed;
  const wastePercent = hasReweigh ? ((record.amountMixed! - record.amountUsed!) / record.amountMixed!) * 100 : 0;
  const hasWaste = hasReweigh && wastePercent > wasteTargetPercent;

  // Re-weigh not yet done: amountUsed is null/undefined, equals 0, or equals amountMixed
  const needsReweigh = record.amountMixed && record.amountMixed > 0 && 
    (!record.amountUsed || record.amountUsed === 0 || record.amountUsed === record.amountMixed);
  
  const hasComponents = record.components && record.components.length > 0;
  const unit = record.unit || 'g';
  
  const optimized = hasWaste && hasComponents ? calculateOptimizedAmounts(record) : null;

  const handleStartEdit = () => {
    setEditedNotes(record.notes || "");
    setIsEditingNotes(true);
  };

  const handleSaveNotes = () => {
    onEditNotes?.(record.id, editedNotes);
    setIsEditingNotes(false);
  };

  return (
    <motion.div
      className="p-4 rounded-lg bg-secondary/50 border border-border/50"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {record.date}
            </span>
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              {record.stylist}
            </span>
          </div>
          
          {record.serviceName && (
            <Badge variant="secondary" className="mb-2 text-xs font-medium">
              {record.serviceName}
            </Badge>
          )}

          {record.bowls && record.bowls.length > 0 ? (
            <div className="space-y-2.5 mb-2">
              {record.bowls.map((bowl, bi) => (
                <div key={bowl.bowlId}>
                  {record.bowls!.length > 1 && (
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      {bowl.name}
                    </p>
                  )}
                  <ul className="space-y-0.5 text-sm text-foreground">
                    {bowl.components.map((c, ci) => (
                      <li key={ci} className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-primary/60 flex-shrink-0" />
                        <span>{c.productName}</span>
                        <span className="text-muted-foreground">— {c.amount}{c.unit || record.unit || 'g'}</span>
                      </li>
                    ))}
                    {bowl.developer && (
                      <li className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-primary/60 flex-shrink-0" />
                        <span>{bowl.developer.name}</span>
                        <span className="text-muted-foreground">— {bowl.developer.amount}{bowl.developer.unit || record.unit || 'g'}</span>
                      </li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-mono text-sm text-foreground mb-2">
              {formatFormula(record)}
            </p>
          )}
          
          {isEditingNotes ? (
            <div className="space-y-2 mt-2">
              <Textarea
                value={editedNotes}
                onChange={(e) => setEditedNotes(e.target.value)}
                placeholder="Add session notes..."
                className="min-h-[60px] text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" variant="default" onClick={handleSaveNotes} className="h-7 gap-1 text-xs">
                  <Check className="w-3 h-3" /> Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditingNotes(false)} className="h-7 gap-1 text-xs">
                  <X className="w-3 h-3" /> Cancel
                </Button>
              </div>
            </div>
          ) : (
            record.notes && (
              <p className="text-sm text-muted-foreground italic">
                {record.notes}
              </p>
            )
          )}

          {record.canvasPreviewUrl && (
            <a
              href={record.canvasPreviewUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block"
              title="Open head sheet sketch"
            >
              <img
                src={record.canvasPreviewUrl}
                alt="Head sheet sketch"
                loading="lazy"
                className="h-20 rounded-md border border-border object-cover hover:opacity-80 transition-opacity"
              />
            </a>
          )}

          {hasReweigh && (
            <p className={`text-xs mt-2 flex items-center gap-1.5 ${hasWaste ? 'text-amber-500' : 'text-emerald-500'}`}>
              <Scale className="w-3 h-3" />
              Reweighed — {wastePercent.toFixed(0)}% waste
            </p>
          )}
          
        </div>
        
        <div className="flex flex-col gap-2 flex-shrink-0">
          {canEditFormulas && !isEditingNotes && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={handleStartEdit}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              {canDeleteSessions && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this session?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove the color session from {record.date} and all associated bowl data. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDeleteSession?.(record.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              )}
            </div>
          )}

          {isWithin12Hours && onContinueSession && (
            <Button 
              variant="default" 
              size="sm"
              onClick={() => onContinueSession(record)}
              className="gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              Continue Session
            </Button>
          )}

          {onUseAgain && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onUseAgain(record)}
              className="gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Use Again
            </Button>
          )}

          {onReweigh && (needsReweigh || hasWaste) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowReweigh(!showReweigh);
                if (!showReweigh) setLeftoverUnit(unit);
              }}
              className="gap-1.5"
            >
              <Scale className="w-3.5 h-3.5" />
              {needsReweigh ? "Re-Weigh" : "Re-Weigh Again"}
            </Button>
          )}
          
          {hasWaste && hasComponents && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReformulate(!showReformulate)}
              className="gap-1.5 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              Reformulate
              {showReformulate ? (
                <ChevronUp className="w-3 h-3 ml-1" />
              ) : (
                <ChevronDown className="w-3 h-3 ml-1" />
              )}
            </Button>
          )}
        </div>
      </div>
      
      <AnimatePresence>
        {showReweigh && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-medium text-foreground">Leftover Weight</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                {isMultiBowl ? "Select which bowl you're re-weighing, then enter the leftover." : "Weigh what's left in the bowl to calculate actual usage."}
              </p>
              {isMultiBowl && (
                <Select value={selectedBowlId || ""} onValueChange={setSelectedBowlId}>
                  <SelectTrigger className="h-9 focus-visible:ring-offset-0 focus-visible:ring-inset">
                    <SelectValue placeholder="Select bowl…" />
                  </SelectTrigger>
                  <SelectContent>
                    {record.bowls!.map((bowl) => (
                      <SelectItem key={bowl.bowlId} value={bowl.bowlId}>
                        {bowl.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="flex items-center gap-2">
                <div className="relative flex-shrink-0">
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={leftoverAmount}
                    onChange={(e) => setLeftoverAmount(e.target.value)}
                    placeholder="0.0"
                    className="w-24 h-9 pr-1 focus-visible:ring-offset-0 focus-visible:ring-inset"
                    autoFocus
                  />
                </div>
                <Select value={leftoverUnit} onValueChange={setLeftoverUnit}>
                  <SelectTrigger className="w-16 h-9 focus-visible:ring-offset-0 focus-visible:ring-inset">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="oz">oz</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-1.5 ml-auto">
                  <Button
                    size="sm"
                    className="h-9 gap-1.5"
                    disabled={!leftoverAmount || Number(leftoverAmount) < 0 || (isMultiBowl && !selectedBowlId)}
                    onClick={() => {
                      const bowlId = isMultiBowl ? selectedBowlId : record.bowls?.[0]?.bowlId;
                      if (bowlId && onReweighBowl) {
                        onReweighBowl(record.id, bowlId, Number(leftoverAmount), leftoverUnit);
                      } else {
                        onReweigh?.(record.id, Number(leftoverAmount), leftoverUnit);
                      }
                      setShowReweigh(false);
                      setLeftoverAmount("");
                      setSelectedBowlId(null);
                      toast.success("Reweigh recorded");
                    }}
                  >
                    <Check className="w-3.5 h-3.5" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9"
                    onClick={() => {
                      setShowReweigh(false);
                      setLeftoverAmount("");
                      setSelectedBowlId(null);
                    }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showReformulate && optimized && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-border/50">
              <h4 className="text-sm font-medium text-foreground mb-3">Optimized Formula</h4>
              
              <div className="space-y-3 mb-4">
                {optimized.bowls.map((bowl) => (
                  <div key={bowl.bowlId}>
                    {optimized.bowls.length > 1 && (
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                        {bowl.name}{!bowl.changed && ' — no change'}
                      </p>
                    )}
                    {bowl.changed ? (
                      <div className="space-y-1">
                        {bowl.components.map((c, ci) => (
                          <div key={ci} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{c.productName}</span>
                            <span className="text-foreground font-medium">{c.amount}{unit}</span>
                          </div>
                        ))}
                        {bowl.developer && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{bowl.developer.name}</span>
                            <span className="text-foreground font-medium">{bowl.developer.amount}{unit}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Original amounts kept</p>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="flex items-center justify-between pt-3 border-t border-border/30">
                <span className="text-sm text-muted-foreground">
                  {optimized.savings > 0
                    ? <>Saves <span className="font-medium text-foreground">{optimized.savings}{unit}</span> vs. last mix</>
                    : <>Total: <span className="font-medium text-foreground">
                        {optimized.components.reduce((s, c) => s + c.amount, 0) + (optimized.developer?.amount || 0)}{unit}
                      </span></>}
                </span>
                {onUseOptimized && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => onUseOptimized(record, optimized.components, optimized.developer)}
                    className="gap-1.5"
                  >
                    <FlaskConical className="w-3.5 h-3.5" />
                    Use Optimized
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Financial Breakdown — owner / cost-visible only */}
      <SessionFinancialBreakdown sessionId={record.id} />

      {/* View Charge Collapsible */}
      {salonSettings && record.components && record.components.length > 0 && (
        <Collapsible open={showCharge} onOpenChange={setShowCharge}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-3 gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <DollarSign className="w-3.5 h-3.5" />
              View Charge
              {showCharge ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SessionChargeBreakdown record={record} salonSettings={salonSettings} services={services} />
          </CollapsibleContent>
        </Collapsible>
      )}
    </motion.div>
  );
}

/** Full receipt-style breakdown of one session: charged → product cost → commission → salon keeps. */
function SessionFinancialBreakdown({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false);
  const { effectiveStaff } = useEffectiveStaff();
  const canSee = !!effectiveStaff?.permissions.can_view_product_costs;
  const { data, isLoading } = useSessionFinancials(sessionId, open && canSee);

  if (!canSee) return null;

  const fmt = (n: number) => `$${n.toFixed(2)}`;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-3 gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Receipt className="w-3.5 h-3.5" />
          Financial Breakdown
          {open ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-3 pt-3 border-t border-border/50">
          {isLoading || !data ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-1.5 text-sm">
              <Row label="Client charged" value={data.charged} bold />
              <Row label="Product cost (wholesale)" value={-data.productCost} muted />
              {data.bowlFee > 0 && (
                <Row label="Bowl fee" value={data.bowlFee} muted />
              )}
              <div className="pt-2 mt-1 border-t border-border/30 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-success">Salon Keeps</span>
                <span className="text-base font-bold text-success">{fmt(data.salonKeeps)}</span>
              </div>
              <p className="text-[11px] text-muted-foreground/70 leading-snug pt-1">
                {data.laborCharge > 0
                  ? `Labor ${fmt(data.laborCharge)} + product markup ${fmt(data.productMarkup)} make up the charge above product cost.`
                  : `Product markup ${fmt(data.productMarkup)} = what you charged above wholesale cost.`}
              </p>

              {data.countedRows.length > 0 && (
                <details className="pt-3 mt-2 border-t border-border/30">
                  <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground">
                    Products counted ({data.countedRows.length})
                  </summary>
                  <div className="mt-2 space-y-1">
                    {data.countedRows.map((r, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px]">
                        <span className="text-foreground truncate pr-2">
                          <span className="uppercase text-muted-foreground mr-1">[{r.bucket[0]}]</span>
                          {r.brand ? `${r.brand} ` : ''}{r.name}
                          {r.shade ? ` · ${r.shade}` : ''}
                          <span className="text-muted-foreground"> · {r.amount}{r.unit}</span>
                          {!r.hasCostData && <span className="text-destructive ml-1">· missing cost</span>}
                        </span>
                        <span className="tabular-nums text-muted-foreground">{fmt(r.cost)}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function Row({ label, value, bold, muted }: { label: string; value: number; bold?: boolean; muted?: boolean }) {
  const neg = value < 0;
  return (
    <div className="flex items-center justify-between">
      <span className={`${bold ? 'font-semibold text-foreground' : muted ? 'text-muted-foreground' : 'text-foreground'}`}>
        {label}
      </span>
      <span className={`tabular-nums ${bold ? 'font-semibold' : ''} ${neg ? 'text-destructive' : 'text-foreground'}`}>
        {neg ? '-' : ''}${Math.abs(value).toFixed(2)}
      </span>
    </div>
  );
}

/** Calculates and displays charge breakdown for a historical session */
function SessionChargeBreakdown({ record, salonSettings, services }: { 
  record: FormulaRecord; 
  salonSettings: SalonSettings;
  services?: ServiceMenuItem[];
}) {
  const fmt = (n: number) => `$${n.toFixed(2)}`;
  const selectedService = record.serviceId && services ? services.find(s => s.id === record.serviceId) : null;
  const backbarMultiplier = salonSettings.backbar_multiplier ?? 4;
  
  // We don't have product costs in formula history, so show a simplified view
  // based on what we can calculate: service price + bowl count fees
  const bowlFee = salonSettings.bowl_fee || 0;
  // Count bowls: each component group in a session = 1 bowl (approximation)
  // For a more accurate count we'd need bowl data, but components are flattened
  const bowlCount = 1; // Minimum 1 bowl per session

  if (selectedService) {
    const total = selectedService.price + (bowlCount * bowlFee);
    return (
      <div className="mt-3 pt-3 border-t border-border/50 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-foreground">{selectedService.name} Service</span>
          <span className="font-medium text-foreground">{fmt(selectedService.price)}</span>
        </div>
        {bowlFee > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>Bowl Fee</span>
            <span>+{fmt(bowlFee)}</span>
          </div>
        )}
        <div className="pt-2 mt-2 border-t border-border/30 flex justify-between items-center">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Minimum Total</span>
          <span className="text-lg font-bold text-foreground">{fmt(total)}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Overage charges may apply if product exceeded the service allotment.
        </p>
      </div>
    );
  }

  // No service — can't calculate exact charge without product costs
  return (
    <div className="mt-3 pt-3 border-t border-border/50 space-y-2 text-sm">
      <div className="flex justify-between text-muted-foreground">
        <span>Pricing model</span>
        <span>{backbarMultiplier}× markup</span>
      </div>
      {bowlFee > 0 && (
        <div className="flex justify-between text-muted-foreground">
          <span>Bowl Fee</span>
          <span>+{fmt(bowlFee)}</span>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Exact charge was calculated at time of mixing. Continue or repeat session to see full breakdown.
      </p>
    </div>
  );
}
