/**
 * Activity log — fire-and-forget audit trail for Aksure modules.
 *
 * Writes one append-only row to `activity_log` (migration 0015) per call. The table
 * rejects UPDATE/DELETE via a trigger, so these rows are permanent.
 *
 * Design: logging must NEVER break the user action that triggered it. `logActivity`
 * returns void (not a promise the caller awaits) and swallows every failure to the
 * console. A logging outage is invisible to the user.
 */
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";
import { CURRENT_TENANT_ID } from "@/constants/tenant";
import type { Database, Json } from "@/types/database";

type ActivityInsert = Database["public"]["Tables"]["activity_log"]["Insert"];
type UserRole = Database["public"]["Enums"]["user_role"];

export interface LogActivityInput {
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: Json | null;
  after?: Json | null;
  notes?: string | null;
}

/**
 * Record an activity-log event. Fire-and-forget: returns immediately, never throws,
 * never rejects. `actor_id`/`actor_role` come from the auth store, `tenant_id` from
 * CURRENT_TENANT_ID, `user_agent` from the browser.
 */
export function logActivity(input: LogActivityInput): void {
  try {
    const { user } = useAuthStore.getState();
    const actorId = user?.id ?? null;
    // The app role (storekeeper/manager/admin) is profile/server data, not part of the
    // auth session. We surface it from session metadata when present, else null (the
    // column is nullable). TODO: thread the resolved role through once it's on the session.
    const actorRole = (user?.user_metadata?.role as UserRole | undefined) ?? null;
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : null;

    const row: ActivityInsert = {
      tenant_id: CURRENT_TENANT_ID,
      actor_id: actorId,
      actor_role: actorRole,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      before: input.before ?? null,
      after: input.after ?? null,
      ip_address: null, // TODO: server-side concern — set via an edge function / DB default.
      user_agent: userAgent,
      notes: input.notes ?? null,
    };

    void Promise.resolve(supabase.from("activity_log").insert(row))
      .then(({ error }) => {
        if (error) console.error("logActivity: insert failed:", error.message);
      })
      .catch((err) => console.error("logActivity: insert threw:", err));
  } catch (err) {
    // A logging failure must never break the user action that triggered it.
    console.error("logActivity: unexpected failure:", err);
  }
}
