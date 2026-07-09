import { motion } from "framer-motion";
import { Ruler } from "lucide-react";
import { useSalonSettings } from "@/hooks/useSalonSettings";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export function DisplayUnitCard() {
  const { settings, updateSettings, isUpdating } = useSalonSettings();

  if (!settings) return null;

  const currentUnit = (settings as any).preferred_display_unit || "g";

  return (
    <motion.div
      className="stat-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
          <Ruler className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-medium text-foreground">Display Unit</h3>
          <p className="text-sm text-muted-foreground">
            Set the default unit for bowls, reports, and exports. Inventory stays in ml.
          </p>
        </div>
      </div>

      <ToggleGroup
        type="single"
        value={currentUnit}
        onValueChange={(value) => {
          if (value) {
            updateSettings({ preferred_display_unit: value } as any);
          }
        }}
        disabled={isUpdating}
        className="justify-start"
      >
        <ToggleGroupItem value="oz" className="px-6 font-medium">
          oz
        </ToggleGroupItem>
        <ToggleGroupItem value="g" className="px-6 font-medium">
          g
        </ToggleGroupItem>
      </ToggleGroup>
    </motion.div>
  );
}
