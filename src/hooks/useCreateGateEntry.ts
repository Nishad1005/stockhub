import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { CURRENT_TENANT_ID } from "@/constants/tenant";
import type { Database } from "@/types/database";
import { todayGateEntriesKeys } from "./useTodayGateEntries";
import { grnSuppliersKeys } from "./useGrnSuppliers";

type GrnInsert = Database["public"]["Tables"]["grns"]["Insert"];
type GrnGateEntryInsert = Database["public"]["Tables"]["grn_gate_entries"]["Insert"];

export interface CreateGateEntryInput {
  vehicleNumber: string;
  driverName: string;
  driverLicense: string | null;
  driverPhone: string | null;
  supplierName: string;
  poRef: string | null;
  invoiceRef: string | null;
  invoiceDate: string | null;
  notes: string | null;
}

export interface CreateGateEntryResult {
  grnId: string;
  gateEntryId: string;
  grnNumber: string;
}

/**
 * GRN Stage 1 create: a GRN header (status DRAFT) + its 1:1 gate-entry row.
 * Photos are uploaded by the caller via useAttachments AFTER this resolves (the
 * new gate-entry id is required first). grn_number comes from next_grn_number()
 * — the same shared sequence Stock IN uses, per the Sprint-1 spec.
 */
export function useCreateGateEntry() {
  const qc = useQueryClient();
  return useMutation<CreateGateEntryResult, Error, CreateGateEntryInput>({
    mutationFn: async (input) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("You must be signed in to log a gate entry.");

      // 1. GRN number (shared GRN sequence)
      const { data: grnNumber, error: refErr } = await supabase.rpc("next_grn_number");
      if (refErr) throw refErr;
      if (!grnNumber) throw new Error("No GRN number returned by next_grn_number().");

      // 2. GRN header (DRAFT). security_at = now (Stage 1 just completed).
      const grnRow: GrnInsert = {
        tenant_id: CURRENT_TENANT_ID,
        grn_number: grnNumber,
        status: "DRAFT",
        supplier_name: input.supplierName,
        po_ref: input.poRef,
        invoice_ref: input.invoiceRef,
        invoice_date: input.invoiceDate,
        created_by: uid,
        security_at: new Date().toISOString(),
      };
      const { data: grn, error: grnErr } = await supabase
        .from("grns").insert(grnRow).select("id").single();
      if (grnErr) throw grnErr;

      // 3. Gate entry (1:1 with the GRN)
      const gateRow: GrnGateEntryInsert = {
        tenant_id: CURRENT_TENANT_ID,
        grn_id: grn.id,
        vehicle_number: input.vehicleNumber,
        driver_name: input.driverName,
        driver_license: input.driverLicense,
        driver_phone: input.driverPhone,
        notes: input.notes,
        created_by: uid,
      };
      const { data: gate, error: gateErr } = await supabase
        .from("grn_gate_entries").insert(gateRow).select("id").single();
      if (gateErr) throw gateErr;

      return { grnId: grn.id, gateEntryId: gate.id, grnNumber };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: todayGateEntriesKeys.all });
      qc.invalidateQueries({ queryKey: grnSuppliersKeys.all });
    },
  });
}
