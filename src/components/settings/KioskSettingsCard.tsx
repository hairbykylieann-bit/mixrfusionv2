import { motion } from "framer-motion";
import { Monitor, Clock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSalonSettings } from "@/hooks/useSalonSettings";
import { useKiosk } from "@/contexts/KioskContext";

export function KioskSettingsCard() {
  const { settings, updateSettings, isUpdating } = useSalonSettings();
  const { isKioskMode, enableKioskMode, isLocked } = useKiosk();

  if (!settings) return null;

  const timeoutOptions = [
    { value: "5", label: "5 minutes" },
    { value: "10", label: "10 minutes" },
    { value: "15", label: "15 minutes" },
    { value: "30", label: "30 minutes" },
    { value: "60", label: "1 hour" },
  ];

  return (
    <motion.div
      className="stat-card space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-3 pb-4 border-b border-border/50">
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
          <Monitor className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-medium text-foreground">Kiosk Mode</h3>
          <p className="text-sm text-muted-foreground">
            Device sharing for salon stations
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Enable Device Sharing */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-foreground font-medium">Enable Device Sharing</Label>
            <p className="text-sm text-muted-foreground">
              Allow multiple stylists to use this device with quick PIN login
            </p>
          </div>
          <Switch
            checked={isKioskMode}
            onCheckedChange={(checked) => enableKioskMode(checked)}
          />
        </div>

        {/* PIN Timeout */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <Label className="text-foreground font-medium">PIN Timeout</Label>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            Auto-lock after inactivity
          </p>
          <Select
            value={settings.pin_timeout_minutes.toString()}
            onValueChange={(value) =>
              updateSettings({ pin_timeout_minutes: parseInt(value) })
            }
            disabled={isUpdating || !settings.kiosk_mode_enabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timeoutOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Indicator */}
        {isKioskMode && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <div
              className={`w-2 h-2 rounded-full ${
                isLocked ? "bg-amber-500" : "bg-green-500"
              }`}
            />
            <span className="text-sm text-muted-foreground">
              Kiosk mode is {isLocked ? "locked" : "active"}
            </span>
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="pt-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground">
          Kiosk mode is enabled <strong>on this device only</strong>. Staff members 
          can quickly switch between profiles using their 4-digit PIN. This is ideal 
          for shared tablets at the color bar.
        </p>
      </div>
    </motion.div>
  );
}
