/**
 * TRANSITION SHIM — new frontend, old database.
 *
 * While the live database hasn't run the latest migrations, inserts that
 * include brand-new columns fail with "column not found in schema cache".
 * These helpers let a save retry without the new fields, so the app keeps
 * working today and upgrades itself automatically the moment migrations run.
 *
 * Delete this file once all migrations are applied (vault MUST-DO checklist).
 */

// Columns added by not-yet-applied migrations, per table
export const PENDING_COLUMNS: Record<string, string[]> = {
  staff: ["can_view_own_reports", "can_delete_sessions"],
  session_bowls: ["processing_time_minutes"],
};

export function isMissingColumnError(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null;
  if (!e) return false;
  if (e.code === "PGRST204" || e.code === "42703") return true;
  return /column|schema cache/i.test(e.message ?? "");
}

export function stripPendingColumns<T extends Record<string, unknown>>(
  table: keyof typeof PENDING_COLUMNS,
  row: T,
): T {
  const strip = PENDING_COLUMNS[table] ?? [];
  const out = { ...row };
  for (const k of strip) delete (out as Record<string, unknown>)[k];
  return out;
}
