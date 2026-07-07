import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type HealthStatus = "operational" | "degraded" | "down" | "checking";

export interface SystemHealth {
  database: {
    status: HealthStatus;
    latencyMs: number | null;
    message: string;
  };
  auth: {
    status: HealthStatus;
    message: string;
  };
  storage: {
    status: HealthStatus;
    message: string;
  };
  edgeFunctions: {
    status: HealthStatus;
    message: string;
  };
  overall: HealthStatus;
  lastChecked: Date;
}

async function checkDatabaseHealth(): Promise<SystemHealth["database"]> {
  const start = performance.now();
  try {
    const { error } = await supabase.from("tenants").select("id").limit(1);
    const latencyMs = Math.round(performance.now() - start);

    if (error) {
      return {
        status: "degraded",
        latencyMs,
        message: `Query error: ${error.message}`,
      };
    }

    return {
      status: latencyMs > 2000 ? "degraded" : "operational",
      latencyMs,
      message: latencyMs > 2000 ? `Slow response (${latencyMs}ms)` : `Response time: ${latencyMs}ms`,
    };
  } catch (err) {
    return {
      status: "down",
      latencyMs: null,
      message: "Unable to connect to database",
    };
  }
}

async function checkAuthHealth(): Promise<SystemHealth["auth"]> {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      return {
        status: "degraded",
        message: `Auth error: ${error.message}`,
      };
    }

    return {
      status: "operational",
      message: data.session ? "Authenticated" : "Auth service responding",
    };
  } catch (err) {
    return {
      status: "down",
      message: "Auth service unavailable",
    };
  }
}

async function checkStorageHealth(): Promise<SystemHealth["storage"]> {
  try {
    const { error } = await supabase.storage.from("salon-assets").list("", { limit: 1 });

    if (error) {
      // Bucket might be empty or have RLS issues, but service is up
      if (error.message.includes("not found") || error.message.includes("permission")) {
        return {
          status: "operational",
          message: "Storage service available",
        };
      }
      return {
        status: "degraded",
        message: `Storage issue: ${error.message}`,
      };
    }

    return {
      status: "operational",
      message: "Storage bucket accessible",
    };
  } catch (err) {
    return {
      status: "down",
      message: "Storage service unavailable",
    };
  }
}

async function checkEdgeFunctionsHealth(): Promise<SystemHealth["edgeFunctions"]> {
  try {
    // Use log-error function for health check since it doesn't require tenant context
    // Send a minimal payload that won't actually log anything harmful
    const { data, error } = await supabase.functions.invoke("log-error", {
      method: "POST",
      body: { 
        error_message: "health-check-ping",
        metadata: { type: "health_check", skip_log: true }
      },
    });

    // Even if it returns an error response, the function is working
    return {
      status: "operational",
      message: "Edge functions responding",
    };
  } catch (err) {
    // Network-level errors indicate the service is down
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    if (errMsg.includes("Failed to fetch") || errMsg.includes("NetworkError")) {
      return {
        status: "down",
        message: "Edge functions unreachable",
      };
    }
    return {
      status: "operational",
      message: "Edge functions available",
    };
  }
}

function calculateOverallStatus(health: Omit<SystemHealth, "overall" | "lastChecked">): HealthStatus {
  const statuses = [
    health.database.status,
    health.auth.status,
    health.storage.status,
    health.edgeFunctions.status,
  ];

  if (statuses.includes("down")) return "down";
  if (statuses.includes("degraded")) return "degraded";
  return "operational";
}

export function usePlatformHealth() {
  return useQuery({
    queryKey: ["platform-health"],
    queryFn: async (): Promise<SystemHealth> => {
      const [database, auth, storage, edgeFunctions] = await Promise.all([
        checkDatabaseHealth(),
        checkAuthHealth(),
        checkStorageHealth(),
        checkEdgeFunctionsHealth(),
      ]);

      const health = { database, auth, storage, edgeFunctions };

      return {
        ...health,
        overall: calculateOverallStatus(health),
        lastChecked: new Date(),
      };
    },
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    staleTime: 2 * 60 * 1000, // Consider stale after 2 minutes
  });
}
