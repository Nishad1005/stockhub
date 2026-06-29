import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const openGrnsKeys = { all: ["open-grns"] as const };

export interface OpenGrn {
  grnId: string;
  grnNumber: string;
  supplierName: string;
  vehicleNumber: string | null;
  driverName: string | null;
  gateInAt: string;
  waitingMinutes: number;
}

/**
 * All DRAFT GRNs (any day — DRAFT is "still open" by definition), oldest first.
 * Two simple typed selects (GRNs, then their gate rows) rather than an embedded
 * join, matching useTodayGateEntries. waitingMinutes is computed at fetch time and
 * stays live via refetchInterval, not a setInterval.
 */
async function fetchOpenGrns(): Promise<OpenGrn[]> {
  const { data: grns, error } = await supabase
    .from("grns")
    .select("id, grn_number, supplier_name, created_at")
    .eq("status", "DRAFT")
    .order("created_at", { ascending: true });
  if (error) throw error;
  if (!grns || grns.length === 0) return [];

  const { data: gates, error: gateErr } = await supabase
    .from("grn_gate_entries")
    .select("grn_id, vehicle_number, driver_name, gate_in_at")
    .in("grn_id", grns.map((g) => g.id));
  if (gateErr) throw gateErr;

  const byGrn = new Map((gates ?? []).map((g) => [g.grn_id, g]));
  const now = Date.now();
  return grns.map((g) => {
    const gate = byGrn.get(g.id);
    const gateInAt = gate?.gate_in_at ?? g.created_at;
    const waitingMinutes = Math.max(0, Math.floor((now - new Date(gateInAt).getTime()) / 60000));
    return {
      grnId: g.id,
      grnNumber: g.grn_number,
      supplierName: g.supplier_name,
      vehicleNumber: gate?.vehicle_number ?? null,
      driverName: gate?.driver_name ?? null,
      gateInAt,
      waitingMinutes,
    };
  });
}

export function useOpenGrns() {
  return useQuery({
    queryKey: openGrnsKeys.all,
    queryFn: fetchOpenGrns,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000, // keep wait times live without a manual setInterval
  });
}
