import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface StaffMarkupInputProps {
  value: number; // multiplier value (e.g. 4.0)
  onChange: (multiplier: number) => void;
  disabled?: boolean;
  salonDefault?: number;
}

export function StaffMarkupInput({ value, onChange, disabled, salonDefault }: StaffMarkupInputProps) {
  const [mode, setMode] = useState<"multiplier" | "percent">("multiplier");
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  const multiplier = value || 4;
  const percentValue = Math.round((multiplier - 1) * 100);

  const handleSave = () => {
    const num = parseFloat(editValue);
    if (isNaN(num)) return;
    if (mode === "multiplier") {
      if (num < 1) return;
      onChange(num);
    } else {
      if (num < 0) return;
      onChange(num / 100 + 1);
    }
    setIsEditing(false);
  };

  const handleSliderChange = ([v]: number[]) => {
    if (mode === "multiplier") {
      onChange(v);
    } else {
      onChange(v / 100 + 1);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-foreground">
          {mode === "multiplier" ? "Backbar Multiplier" : "Backbar Markup"}
        </Label>
        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(v) => { if (v) setMode(v as "multiplier" | "percent"); }}
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

      <div className="flex items-center justify-between mb-2">
        {isEditing ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setIsEditing(false); }}
              className="w-20 text-sm font-medium bg-secondary border border-border rounded px-2 py-1 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
              step={mode === "multiplier" ? 0.25 : 5}
            />
            <span className="text-sm text-muted-foreground">{mode === "multiplier" ? "×" : "%"}</span>
            <button type="button" onClick={handleSave} disabled={disabled} className="p-1 rounded bg-success/20 text-success hover:bg-success/30">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={() => setIsEditing(false)} className="p-1 rounded bg-destructive/20 text-destructive hover:bg-destructive/30">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => { setEditValue(mode === "multiplier" ? multiplier.toString() : percentValue.toString()); setIsEditing(true); }}
            className="flex items-center gap-1.5 group"
            disabled={disabled}
          >
            <span className="text-lg font-semibold text-primary">
              {mode === "multiplier" ? `${multiplier}×` : `${percentValue}%`}
            </span>
            <Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}
      </div>

      <Slider
        value={[mode === "multiplier" ? multiplier : percentValue]}
        onValueChange={handleSliderChange}
        min={mode === "multiplier" ? 2 : 100}
        max={mode === "multiplier" ? 6 : 500}
        step={mode === "multiplier" ? 0.5 : 50}
        disabled={disabled}
      />
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>{mode === "multiplier" ? "2×" : "100%"}</span>
        <span>{mode === "multiplier" ? "4× standard" : "300% standard"}</span>
        <span>{mode === "multiplier" ? "6×" : "500%"}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {mode === "multiplier"
          ? "How many times product cost to charge this stylist's clients."
          : "Percentage markup on product cost for this stylist's clients."}
        {salonDefault != null && (
          <> Salon default: {salonDefault}×</>
        )}
      </p>
    </div>
  );
}
