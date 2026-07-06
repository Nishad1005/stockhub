import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  GrnDetail,
  GrnGateEntryDetail,
  GrnLineDetail,
  GrnActorProfile,
} from "@/types/grn";

export const grnDetailKeys = { byId: (id: string) => ["grn-detail", id] as const };

interface GrnDetailData {
  grn: GrnDetail | null;
  gateEntry: GrnGateEntryDetail | null;
  lines: GrnLineDetail[];
  createdByProfile: GrnActorProfile | null;
}

/**
 * One GRN's full detail for the verification screen. Separate typed selects
 * (grn → creator profile → gate entry → lines) rather than embedded joins,
 * matching useOpenGrns. Returns nulls (not throws) when the GRN/gate row is
 * absent so the screen can show a "not found" state.
 */
async function fetchGrnDetail(grnId: string): Promise<GrnDetailData> {
  const { data: grnRow, error } = await supabase
    .from("grns")
    .select(
      "id, grn_number, status, supplier_name, po_ref, invoice_ref, invoice_date, created_at, created_by, security_at, storekeeper_at, completed_at, rejection_reason",
    )
    .eq("id", grnId)
    .maybeSingle();
  if (error) throw error;
  if (!grnRow) return { grn: null, gateEntry: null, lines: [], createdByProfile: null };

  const grn: GrnDetail = {
    id: grnRow.id,
    grnNumber: grnRow.grn_number,
    status: grnRow.status,
    supplierName: grnRow.supplier_name,
    poRef: grnRow.po_ref,
    invoiceRef: grnRow.invoice_ref,
    invoiceDate: grnRow.invoice_date,
    createdAt: grnRow.created_at,
    createdBy: grnRow.created_by,
    securityAt: grnRow.security_at,
    storekeeperAt: grnRow.storekeeper_at,
    completedAt: grnRow.completed_at,
    rejectionReason: grnRow.rejection_reason,
  };

  const { data: prof, error: profErr } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", grnRow.created_by)
    .maybeSingle();
  if (profErr) throw profErr;
  const createdByProfile: GrnActorProfile | null = prof
    ? { id: prof.id, fullName: prof.full_name, email: prof.email }
    : null;

  const { data: gate, error: gateErr } = await supabase
    .from("grn_gate_entries")
    .select("id, vehicle_number, driver_name, driver_license, driver_phone, gate_in_at, notes, created_by")
    .eq("grn_id", grnId)
    .maybeSingle();
  if (gateErr) throw gateErr;
  const gateEntry: GrnGateEntryDetail | null = gate
    ? {
        id: gate.id,
        vehicleNumber: gate.vehicle_number,
        driverName: gate.driver_name,
        driverLicense: gate.driver_license,
        driverPhone: gate.driver_phone,
        gateInAt: gate.gate_in_at,
        notes: gate.notes,
        createdBy: gate.created_by,
      }
    : null;

  const { data: lineRows, error: linesErr } = await supabase
    .from("grn_lines")
    .select(
      "id, line_number, item_code, item_name, po_qty, invoice_qty, received_qty, variance_flag, is_unexpected, qc_status, qc_notes, created_at, updated_at",
    )
    .eq("grn_id", grnId)
    .order("line_number", { ascending: true });
  if (linesErr) throw linesErr;
  const lines: GrnLineDetail[] = (lineRows ?? []).map((l) => ({
    id: l.id,
    lineNumber: l.line_number,
    itemCode: l.item_code,
    itemName: l.item_name,
    poQty: l.po_qty,
    invoiceQty: l.invoice_qty,
    receivedQty: l.received_qty,
    varianceFlag: l.variance_flag,
    isUnexpected: l.is_unexpected,
    qcStatus: l.qc_status,
    qcNotes: l.qc_notes,
    createdAt: l.created_at,
    updatedAt: l.updated_at,
  }));

  return { grn, gateEntry, lines, createdByProfile };
}

export function useGrnDetail(grnId: string) {
  const q = useQuery({
    queryKey: grnDetailKeys.byId(grnId),
    queryFn: () => fetchGrnDetail(grnId),
    enabled: grnId.length > 0,
    refetchOnWindowFocus: true,
  });
  return {
    grn: q.data?.grn ?? null,
    gateEntry: q.data?.gateEntry ?? null,
    lines: q.data?.lines ?? [],
    createdByProfile: q.data?.createdByProfile ?? null,
    isLoading: q.isLoading,
    error: q.error,
  };
}
