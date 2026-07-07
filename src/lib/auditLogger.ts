import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

type ActorType = "platform_admin" | "tenant_user";

interface AuditLogParams {
  action: string;
  actorType: ActorType;
  actorUserId: string;
  tenantId?: string | null;
  metadata?: Json;
}

/**
 * Log an audit event to the audit_logs table
 */
export async function logAuditEvent({
  action,
  actorType,
  actorUserId,
  tenantId,
  metadata,
}: AuditLogParams): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("audit_logs")
      .insert([{
        action,
        actor_type: actorType,
        actor_user_id: actorUserId,
        tenant_id: tenantId || null,
        metadata: metadata || null,
      }])
      .select("id")
      .single();

    if (error) {
      console.error("Failed to log audit event:", error);
      return null;
    }

    return data.id;
  } catch (err) {
    console.error("Audit logging error:", err);
    return null;
  }
}

// Convenience functions for common admin actions
export const AuditActions = {
  // Tenant actions
  TENANT_CREATED: "tenant.created",
  TENANT_UPDATED: "tenant.updated",
  TENANT_STATUS_CHANGED: "tenant.status_changed",
  TENANT_SUSPENDED: "tenant.suspended",
  TENANT_ARCHIVED: "tenant.archived",
  TENANT_ACTIVATED: "tenant.activated",
  TENANT_DELETED: "tenant.deleted",

  // Plan actions
  PLAN_CREATED: "plan.created",
  PLAN_UPDATED: "plan.updated",
  PLAN_DELETED: "plan.deleted",

  // Subscription actions
  SUBSCRIPTION_CREATED: "subscription.created",
  SUBSCRIPTION_UPDATED: "subscription.updated",
  SUBSCRIPTION_SEATS_CHANGED: "subscription.seats_changed",
  SUBSCRIPTION_PLAN_CHANGED: "subscription.plan_changed",

  // Impersonation actions
  IMPERSONATION_STARTED: "impersonation.started",
  IMPERSONATION_ENDED: "impersonation.ended",

  // Settings actions
  SETTINGS_UPDATED: "settings.updated",
  WHITELABEL_UPDATED: "whitelabel.updated",
} as const;

export type AuditAction = (typeof AuditActions)[keyof typeof AuditActions];
