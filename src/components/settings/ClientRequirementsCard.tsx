import { motion } from "framer-motion";
import { Settings2, Mail, Phone, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSalonSettings } from "@/hooks/useSalonSettings";

export function ClientRequirementsCard() {
  const { settings, isLoading, updateSettings, isUpdating } = useSalonSettings();

  if (isLoading) {
    return (
      <motion.div
        className="stat-card flex items-center justify-center h-48"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </motion.div>
    );
  }

  if (!settings) return null;

  return (
    <motion.div
      className="stat-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-3 pb-4 border-b border-border/50 mb-6">
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
          <Settings2 className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-medium text-foreground">Client Field Requirements</h3>
          <p className="text-sm text-muted-foreground">Control what information is required for new clients</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <div>
              <Label className="text-foreground">Require Email</Label>
              <p className="text-sm text-muted-foreground">Email will be required when adding clients</p>
            </div>
          </div>
          <Switch
            checked={settings.require_client_email}
            onCheckedChange={(checked) => updateSettings({ require_client_email: checked })}
            disabled={isUpdating}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <div>
              <Label className="text-foreground">Require Phone</Label>
              <p className="text-sm text-muted-foreground">Phone number will be required when adding clients</p>
            </div>
          </div>
          <Switch
            checked={settings.require_client_phone}
            onCheckedChange={(checked) => updateSettings({ require_client_phone: checked })}
            disabled={isUpdating}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border/50">
        These settings apply to both CSV imports and manual client creation.
      </p>
    </motion.div>
  );
}
