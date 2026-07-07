import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { CURRENT_TENANT_ID } from "@/constants/tenant";
import { logActivity } from "@/lib/activity";
import { computeVarianceFlag, nextLineNumber } from "@/lib/grn";
import { grnDetailKeys } from "./useGrnDetail";
import type { Database } from "@/types/database";
import type { GrnLineDetail } from "@/types/grn";

type GrnLineRow = Database["public"]["Tables"]["grn_lines"]["Row"];
type GrnLineInsert = Database["public"]["Tables"]["grn_lines"]["Insert"];

/** Postgres unique_violation — thrown when two adds race on the same line_number. */
const UNIQUE_VIOLATION = "23505";

export interface AddLineInput {
  grnId: string;
  itemCode: string | null;
  itemName: string;
  poQty: number | null;
  invoiceQty: number | null;
}

export interface UpdateLineInput {
  id: string;
  grnId: string;
  itemCode: string | null;
  itemName: string;
  poQty: number | null;
  invoiceQty: number | null;
  /** Current received qty, so variance can be recomputed when invoice qty changes. */
  receivedQty: number | null;
}

export interface SetReceivedInput {
  id: string;
  grnId: string;
  /** "increment" bumps by +1 (scan); "absolute" sets the total (manual field). */
  mode: "increment" | "absolute";
  /** Required for "absolute"; ignored for "increment". */
  value?: number;
}

export interface RemoveLineInput {
  id: string;
  grnId: string;
  lineNumber: number;
  itemName: string;
}

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const uid = data.user?.id;
  if (!uid) throw new Error("You must be signed in.");
  return uid;
}

async function fetchExistingLineNumbers(grnId: string): Promise<number[]> {
  const { data, error } = await supabase
    .from("grn_lines")
    .select("line_number")
    .eq("grn_id", grnId);
  if (error) throw error;
  return (data ?? []).map((r) => r.line_number);
}

/**
 * Insert one line, assigning line_number = COALESCE(max,0)+1 client-side. The
 * unique(grn_id, line_number) constraint is the real guard: if a concurrent add
 * grabbed the same number, we recompute and retry once.
 */
async function insertLineWithNumber(
  base: Omit<GrnLineInsert, "line_number">,
  grnId: string,
): Promise<GrnLineRow> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const existing = await fetchExistingLineNumbers(grnId);
    const line_number = nextLineNumber(existing);
    const { data, error } = await supabase
      .from("grn_lines")
      .insert({ ...base, line_number })
      .select()
      .single();
    if (!error) return data as GrnLineRow;
    if (error.code !== UNIQUE_VIOLATION || attempt === 1) throw error;
  }
  throw new Error("Could not assign a line number.");
}

/**
 * Mutations for GRN Stage 2 line entry + receiving (Sprint 2.2b-1). All writes
 * invalidate the GRN detail query so the verification screen refetches; activity
 * logging is fire-and-forget and never blocks the mutation.
 *
 * Scope note: per-scan received-qty changes are NOT logged (a 50-unit count would
 * flood the audit trail); add / field-edit / remove are logged as spec'd.
 */
export function useGrnLines() {
  const qc = useQueryClient();
  const invalidate = (grnId: string) =>
    qc.invalidateQueries({ queryKey: grnDetailKeys.byId(grnId) });

  const addLine = useMutation<GrnLineDetail, Error, AddLineInput>({
    mutationFn: async (input) => {
      const uid = await currentUserId();
      const row = await insertLineWithNumber(
        {
          tenant_id: CURRENT_TENANT_ID,
          grn_id: input.grnId,
          item_code: input.itemCode,
          item_name: input.itemName.trim(),
          po_qty: input.poQty,
          invoice_qty: input.invoiceQty,
          received_qty: null,
          variance_flag: false,
          is_unexpected: false,
          qc_status: "PENDING",
          created_by: uid,
          updated_by: uid,
        },
        input.grnId,
      );
      logActivity({
        action: "grn.line.added",
        entityType: "grn",
        entityId: input.grnId,
        after: { line_number: row.line_number, item_code: row.item_code, item_name: row.item_name },
        notes: `Line ${row.line_number}: ${row.item_name}`,
      });
      return mapLine(row);
    },
    onSuccess: (_row, input) => invalidate(input.grnId),
  });

  const updateLine = useMutation<GrnLineDetail, Error, UpdateLineInput>({
    mutationFn: async (input) => {
      const uid = await currentUserId();
      const variance_flag = computeVarianceFlag(input.receivedQty, input.invoiceQty);
      const { data, error } = await supabase
        .from("grn_lines")
        .update({
          item_code: input.itemCode,
          item_name: input.itemName.trim(),
          po_qty: input.poQty,
          invoice_qty: input.invoiceQty,
          variance_flag,
          updated_by: uid,
        })
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      const row = data as GrnLineRow;
      logActivity({
        action: "grn.line.updated",
        entityType: "grn",
        entityId: input.grnId,
        after: { line_number: row.line_number, item_code: row.item_code, item_name: row.item_name },
        notes: `Edited line ${row.line_number}: ${row.item_name}`,
      });
      return mapLine(row);
    },
    onSuccess: (_row, input) => invalidate(input.grnId),
  });

  const setReceivedQty = useMutation<GrnLineDetail, Error, SetReceivedInput>({
    mutationFn: async (input) => {
      const uid = await currentUserId();
      const { data: cur, error: curErr } = await supabase
        .from("grn_lines")
        .select("received_qty, invoice_qty")
        .eq("id", input.id)
        .single();
      if (curErr) throw curErr;
      const nextReceived =
        input.mode === "increment"
          ? (cur.received_qty ?? 0) + 1
          : Math.max(0, input.value ?? 0);
      const variance_flag = computeVarianceFlag(nextReceived, cur.invoice_qty);
      const { data, error } = await supabase
        .from("grn_lines")
        .update({ received_qty: nextReceived, variance_flag, updated_by: uid })
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return mapLine(data as GrnLineRow);
    },
    // Received-qty changes are high-frequency (one per scan) — not logged; the
    // detail query still refetches so the count/variance stay live.
    onSuccess: (_row, input) => invalidate(input.grnId),
  });

  const removeLine = useMutation<void, Error, RemoveLineInput>({
    mutationFn: async (input) => {
      const { error } = await supabase.from("grn_lines").delete().eq("id", input.id);
      if (error) throw error;
      logActivity({
        action: "grn.line.removed",
        entityType: "grn",
        entityId: input.grnId,
        before: { line_number: input.lineNumber, item_name: input.itemName },
        notes: `Removed line ${input.lineNumber}: ${input.itemName}`,
      });
    },
    onSuccess: (_v, input) => invalidate(input.grnId),
  });

  return { addLine, updateLine, setReceivedQty, removeLine };
}

function mapLine(l: GrnLineRow): GrnLineDetail {
  return {
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
  };
}
