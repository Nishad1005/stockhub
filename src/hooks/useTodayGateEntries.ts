import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const todayGateEntriesKeys = { all: ["today-gate-entries"] as const };

export interface TodayGateEntry {
  grnId: string;
  grnNumber: string;
  vehicleNumber: string;
  driverName: string;
  supplierName: string;
  createdAt: string;
  status: string;
}

/** Start of the local day, as an ISO timestamp (compared server-side against created_at). */
function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * The signed-in user's gate entries from today (DRAFT and onward). Done as two
 * simple typed selects (GRNs, then their gate rows) rather than an embedded join,
 * to keep the result types clean.
 */
async function fetchTodayGateEntries(): Promise<TodayGateEntry[]> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return [];

  const { data: grns, error } = await supabase
    .from("grns")
    .select("id, grn_number, status, supplier_name, created_at")
    .eq("created_by", uid)
    .gte("created_at", startOfTodayIso())
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!grns || grns.length === 0) return [];

  const { data: gates, error: gateErr } = await supabase
    .from("grn_gate_entries")
    .select("grn_id, vehicle_number, driver_name")
    .in("grn_id", grns.map((g) => g.id));
  if (gateErr) throw gateErr;

  const byGrn = new Map((gates ?? []).map((g) => [g.grn_id, g]));
  return grns.map((g) => {
    const gate = byGrn.get(g.id);
    return {
      grnId: g.id,
      grnNumber: g.grn_number,
      status: g.status,
      supplierName: g.supplier_name,
      createdAt: g.created_at,
      vehicleNumber: gate?.vehicle_number ?? "",
      driverName: gate?.driver_name ?? "",
    };
  });
}

export function useTodayGateEntries() {
  return useQuery({
    queryKey: todayGateEntriesKeys.all,
    queryFn: fetchTodayGateEntries,
    refetchOnWindowFocus: true, // override the app-wide default so the list stays fresh
  });
}
