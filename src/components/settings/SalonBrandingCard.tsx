import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Store, Check, X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSalonSettings } from "@/hooks/useSalonSettings";

/**
 * Salon name only. Logo/branding upload was deliberately removed 2026-07-07:
 * Mix R Fusion is the brand — salons shouldn't have homework to make the tool
 * look right. (Decision in vault: Build Log.)
 */
export function SalonBrandingCard() {
  const { settings, updateSettings, isUpdating } = useSalonSettings();
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState(settings?.salon_name || "");

  useEffect(() => {
    setNameValue(settings?.salon_name || "");
  }, [settings?.salon_name]);

  const save = () => {
    if (!nameValue.trim()) return;
    updateSettings({ salon_name: nameValue.trim() });
    setEditing(false);
  };

  return (
    <motion.div className="stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
          <Store className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground">Salon Name</h3>
          <p className="text-sm text-muted-foreground">Shown to your team across the app</p>
        </div>
        {editing ? (
          <div className="flex items-center gap-2">
            <Input
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
              className="w-48"
              autoFocus
            />
            <Button size="icon" variant="ghost" onClick={save} disabled={isUpdating}>
              <Check className="w-4 h-4 text-success" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setEditing(false)}>
              <X className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="flex items-center gap-2 group">
            <span className="font-semibold text-foreground">{settings?.salon_name || "—"}</span>
            <Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
