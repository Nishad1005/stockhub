import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { GrnActivityEvent } from "@/types/grn";

export const grnActivityKeys = { byGrn: (id: string) => ["grn-activity", id] as const };

/**
 * activity_log events for one GRN, oldest first. actorName is resolved via a
 * second select on profiles. NOTE: activity_log read RLS is manager/admin-only
 * (migration 0015), so storekeepers get an empty list (no error) — the screen
 * renders whatever it's allowed to see.
 */
async function fetchGrnActivity(grnId: string): Promise<GrnActivityEvent[]> {
  const { data, error } = await supabase
    .from("activity_log")
    .select("id, action, actor_id, actor_role, before, after, notes, created_at")
    .eq("entity_type", "grn")
    .eq("entity_id", grnId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const rows = data ?? [];

  const actorIds = [...new Set(rows.map((r) => r.actor_id).filter((x): x is string => !!x))];
  const nameById = new Map<string, string | null>();
  if (actorIds.length > 0) {
    const { data: profs, error: pErr } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", actorIds);
    if (pErr) throw pErr;
    for (const p of profs ?? []) nameById.set(p.id, p.full_name);
  }

  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    actorName: r.actor_id ? nameById.get(r.actor_id) ?? null : null,
    actorRole: r.actor_role,
    before: r.before,
    after: r.after,
    notes: r.notes,
    createdAt: r.created_at,
  }));
}

export function useGrnActivityLog(grnId: string) {
  const q = useQuery({
    queryKey: grnActivityKeys.byGrn(grnId),
    queryFn: () => fetchGrnActivity(grnId),
    enabled: grnId.length > 0,
    refetchOnWindowFocus: true,
  });
  return { events: q.data ?? [], isLoading: q.isLoading };
}
