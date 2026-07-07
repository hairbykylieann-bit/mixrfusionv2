import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Pencil, Check, X, TrendingUp } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useSalonSettings } from "@/hooks/useSalonSettings";

function EditableField({
  label,
  description,
  value,
  prefix = "",
  suffix = "",
  onSave,
  isUpdating,
  step = 0.5,
}: {
  label: string;
  description: string;
  value: number;
  prefix?: string;
  suffix?: string;
  onSave: (v: number) => void;
  isUpdating: boolean;
  step?: number;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value.toString());

  const handleSave = () => {
    const num = parseFloat(editValue);
    if (!isNaN(num)) { onSave(num); setIsEditing(false); }
  };

  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {isEditing ? (
        <div className="flex items-center gap-1">
          {prefix && <span className="text-sm text-muted-foreground">{prefix}</span>}
          <input
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setIsEditing(false); }}
            className="w-20 text-sm font-medium bg-secondary border border-border rounded px-2 py-1 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
            step={step}
          />
          {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
          <button onClick={handleSave} disabled={isUpdating} className="p-1 rounded bg-success/20 text-success hover:bg-success/30">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setIsEditing(false)} className="p-1 rounded bg-destructive/20 text-destructive hover:bg-destructive/30">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{prefix}{value}{suffix}</span>
          <button onClick={() => { setEditValue(value.toString()); setIsEditing(true); }} className="p-1 rounded hover:bg-secondary text-muted-foreground">
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export function PricingModelCard() {
  const { settings, isLoading, updateSettings, isUpdating } = useSalonSettings();
  const [mode, setMode] = useState<'multiplier' | 'percent'>('multiplier');
  const [isEditingMarkup, setIsEditingMarkup] = useState(false);
  const [editMarkupValue, setEditMarkupValue] = useState('');

  if (isLoading || !settings) {
    return (
      <motion.div className="stat-card flex items-center justify-center h-48" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </motion.div>
    );
  }



  const multiplier = settings.backbar_multiplier;
  const percentValue = Math.round((multiplier - 1) * 100);

  const handleMarkupSave = () => {
    const num = parseFloat(editMarkupValue);
    if (isNaN(num)) return;
    if (mode === 'multiplier') {
      if (num < 1 || num > 10) return; // BUG 5 FIX: validate range
      updateSettings({ backbar_multiplier: num });
    } else {
      if (num < 0 || num > 900) return; // BUG 5 FIX: validate range (0% = 1×, 900% = 10×)
      updateSettings({ backbar_multiplier: num / 100 + 1 });
    }
    setIsEditingMarkup(false);
  };

  const handleSliderChange = ([v]: number[]) => {
    if (mode === 'multiplier') {
      updateSettings({ backbar_multiplier: v });
    } else {
      updateSettings({ backbar_multiplier: v / 100 + 1 });
    }
  };

  return (
    <motion.div className="stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-foreground">Backbar Pricing</h3>
          <p className="text-sm text-muted-foreground">How you charge clients for color product</p>
        </div>
        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(v) => { if (v) setMode(v as 'multiplier' | 'percent'); }}
          size="sm"
          className="bg-secondary rounded-lg p-0.5"
        >
          <ToggleGroupItem value="multiplier" className="text-xs px-2.5 py-1 h-7 rounded-md data-[state=on]:bg-background data-[state=on]:shadow-sm">
            ×
          </ToggleGroupItem>
          <ToggleGroupItem value="percent" className="text-xs px-2.5 py-1 h-7 rounded-md data-[state=on]:bg-background data-[state=on]:shadow-sm">
            %
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Backbar Multiplier / Percentage */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-medium text-foreground">
            {mode === 'multiplier' ? 'Backbar Multiplier' : 'Backbar Markup'}
          </Label>
          {isEditingMarkup ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={editMarkupValue}
                onChange={(e) => setEditMarkupValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleMarkupSave(); if (e.key === 'Escape') setIsEditingMarkup(false); }}
                className="w-20 text-sm font-medium bg-secondary border border-border rounded px-2 py-1 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
                step={mode === 'multiplier' ? 0.25 : 5}
              />
              <span className="text-sm text-muted-foreground">{mode === 'multiplier' ? '×' : '%'}</span>
              <button onClick={handleMarkupSave} disabled={isUpdating} className="p-1 rounded bg-success/20 text-success hover:bg-success/30">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setIsEditingMarkup(false)} className="p-1 rounded bg-destructive/20 text-destructive hover:bg-destructive/30">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setEditMarkupValue(mode === 'multiplier' ? multiplier.toString() : percentValue.toString()); setIsEditingMarkup(true); }}
              className="flex items-center gap-1.5 group"
            >
              <span className="text-lg font-semibold text-primary">
                {mode === 'multiplier' ? `${multiplier}×` : `${percentValue}%`}
              </span>
              <Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
        </div>
        <Slider
          value={[mode === 'multiplier' ? multiplier : percentValue]}
          onValueChange={handleSliderChange}
          min={mode === 'multiplier' ? 2 : 100}
          max={mode === 'multiplier' ? 6 : 500}
          step={mode === 'multiplier' ? 0.5 : 50}
          disabled={isUpdating}
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{mode === 'multiplier' ? '2×' : '100%'}</span>
          <span>{mode === 'multiplier' ? '4× standard' : '300% standard'}</span>
          <span>{mode === 'multiplier' ? '6×' : '500%'}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {mode === 'multiplier'
            ? 'How many times product cost to charge clients. 4× is standard for most salons.'
            : 'Percentage markup on product cost. 300% (4× cost) is standard for most salons.'}
        </p>
      </div>

      {/* Bowl Fee, Waste Factor, Rounding */}
      <div className="border-t border-border pt-4 space-y-1">
        <EditableField
          label="Bowl Fee"
          description="Fixed charge per bowl mixed"
          value={settings.bowl_fee}
          prefix="$"
          onSave={(v) => updateSettings({ bowl_fee: v })}
          isUpdating={isUpdating}
          step={0.25}
        />

        <EditableField
          label="Waste Factor"
          description="Expected product loss baked into pricing"
          value={settings.waste_factor_percent}
          suffix="%"
          onSave={(v) => updateSettings({ waste_factor_percent: v })}
          isUpdating={isUpdating}
        />

        <EditableField
          label="Rounding"
          description="Round charges to nearest increment"
          value={settings.rounding_amount}
          prefix="$"
          onSave={(v) => updateSettings({ rounding_amount: v })}
          isUpdating={isUpdating}
          step={0.25}
        />
      </div>

    </motion.div>
  );
}
