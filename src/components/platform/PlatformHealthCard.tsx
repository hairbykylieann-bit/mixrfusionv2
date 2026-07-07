import { motion } from "framer-motion";
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Loader2, 
  Database, 
  Shield, 
  HardDrive, 
  Zap,
  RefreshCw
} from "lucide-react";
import { usePlatformHealth, type HealthStatus, type SystemHealth } from "@/hooks/platform/usePlatformHealth";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

function getStatusIcon(status: HealthStatus) {
  switch (status) {
    case "operational":
      return <CheckCircle2 className="w-4 h-4 text-success" />;
    case "degraded":
      return <AlertTriangle className="w-4 h-4 text-warning" />;
    case "down":
      return <XCircle className="w-4 h-4 text-destructive" />;
    case "checking":
      return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
  }
}

function getStatusColor(status: HealthStatus) {
  switch (status) {
    case "operational":
      return "bg-success";
    case "degraded":
      return "bg-warning";
    case "down":
      return "bg-destructive";
    case "checking":
      return "bg-muted-foreground";
  }
}

function getStatusText(status: HealthStatus) {
  switch (status) {
    case "operational":
      return "All systems operational";
    case "degraded":
      return "Some systems degraded";
    case "down":
      return "System outage detected";
    case "checking":
      return "Checking systems...";
  }
}

interface HealthItemProps {
  label: string;
  status: HealthStatus;
  message: string;
  icon: React.ReactNode;
  latency?: number | null;
}

function HealthItem({ label, status, message, icon, latency }: HealthItemProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{message}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {latency !== undefined && latency !== null && (
          <span className="text-xs text-muted-foreground">{latency}ms</span>
        )}
        {getStatusIcon(status)}
      </div>
    </div>
  );
}

export function PlatformHealthCard() {
  const { data: health, isLoading, isFetching } = usePlatformHealth();
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["platform-health"] });
  };

  const overallStatus = isLoading ? "checking" : (health?.overall ?? "checking");

  return (
    <motion.div
      className="rounded-lg border bg-card p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Platform Health</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleRefresh}
          disabled={isFetching}
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Overall Status */}
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
        <div className={`h-3 w-3 rounded-full ${getStatusColor(overallStatus)}`} />
        <span className="text-sm font-medium text-foreground">
          {getStatusText(overallStatus)}
        </span>
      </div>

      {/* Individual Systems */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 py-2 animate-pulse">
              <div className="w-8 h-8 rounded-lg bg-secondary" />
              <div className="flex-1 space-y-1">
                <div className="h-4 bg-secondary rounded w-24" />
                <div className="h-3 bg-secondary rounded w-32" />
              </div>
            </div>
          ))}
        </div>
      ) : health ? (
        <div className="space-y-1 divide-y divide-border/50">
          <HealthItem
            label="Database"
            status={health.database.status}
            message={health.database.message}
            icon={<Database className="w-4 h-4 text-muted-foreground" />}
            latency={health.database.latencyMs}
          />
          <HealthItem
            label="Authentication"
            status={health.auth.status}
            message={health.auth.message}
            icon={<Shield className="w-4 h-4 text-muted-foreground" />}
          />
          <HealthItem
            label="Storage"
            status={health.storage.status}
            message={health.storage.message}
            icon={<HardDrive className="w-4 h-4 text-muted-foreground" />}
          />
          <HealthItem
            label="Edge Functions"
            status={health.edgeFunctions.status}
            message={health.edgeFunctions.message}
            icon={<Zap className="w-4 h-4 text-muted-foreground" />}
          />
        </div>
      ) : null}

      {/* Last Checked */}
      {health && (
        <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
          Last checked {formatDistanceToNow(health.lastChecked, { addSuffix: true })}
        </p>
      )}
    </motion.div>
  );
}
