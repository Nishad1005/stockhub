import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { validateShelf } from "@/lib/shelf-validator";
import { createMovementSchema, type CreateMovementInput } from "@/lib/validators/movement";
import type { MovementRow, MovementInsert } from "@/types/movement";
import type { EntryInsert } from "@/types/entry";
import { entriesKeys } from "./useEntries";
import { movementsKeys } from "./useMovements";

export interface CreateMovementArgs {
  input: CreateMovementInput;
  /** Matched entry at the shelf (from findSourceEntry in the modal), or null. */
  matchedEntryId: string | null;
  /** On-hand qty at that shelf for an OUT (stored as available_qty); null for IN. */
  availableQty: number | null;
}

/**
 * Record a stock movement (live-count). Logs an immutable `movements` row, then
 * updates the live entry: IN adds (or creates the entry), OUT subtracts (floored
 * at 0). STN-style ref from next_grn_number()/next_mir_number().
 */
export function useCreateMovement() {
  const qc = useQueryClient();
  return useMutation<MovementRow, Error, CreateMovementArgs>({
    mutationFn: async ({ input, matchedEntryId, availableQty }) => {
      const v = createMovementSchema.parse(input);
      const shelf = validateShelf(v.shelfCode);
      if (!shelf.ok || !shelf.code || !shelf.zoneCode || !shelf.fixtureType) {
        throw new Error("Invalid shelf code");
      }

      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("You must be signed in to record a movement.");

      // 1. Ref number
      const rpc = v.type === "IN" ? "next_grn_number" : "next_mir_number";
      const { data: ref, error: refErr } = await supabase.rpc(rpc);
      if (refErr) throw refErr;
      if (!ref) throw new Error(`No ref number returned by ${rpc}()`);

      // 2. Insert the movement (audit)
      const row: MovementInsert = {
        created_by: uid,
        type: v.type,
        ref_number: ref,
        item_code: v.itemCode,
        item_name: v.itemName,
        shelf_code: shelf.code,
        zone_code: shelf.zoneCode,
        fixture_type: shelf.fixtureType,
        qty: v.qty,
        source_or_dest: v.sourceOrDest,
        reason: v.reason,
        authorized_by: v.authorizedBy,
        notes: v.notes,
        available_qty: v.type === "OUT" ? availableQty : null,
      };
      const { data: mv, error: mvErr } = await supabase.from("movements").insert(row).select().single();
      if (mvErr) throw mvErr;

      // 3. Update live stock
      if (matchedEntryId) {
        const { data: ent } = await supabase.from("entries").select("qty").eq("id", matchedEntryId).single();
        const current = ent?.qty ?? 0;
        const next = v.type === "IN" ? current + v.qty : Math.max(0, current - v.qty);
        const { error: updErr } = await supabase.from("entries").update({ qty: next }).eq("id", matchedEntryId);
        if (updErr) throw updErr;
      } else if (v.type === "IN") {
        // Stock arriving where the item wasn't recorded yet → create the entry.
        const newEntry: EntryInsert = {
          created_by: uid,
          zone_code: shelf.zoneCode,
          shelf_code: shelf.code,
          fixture_type: shelf.fixtureType,
          name: v.itemName,
          master_code: v.itemCode,
          assigned_code: null,
          defn: v.itemDefn,
          category: v.itemCategory,
          qty: v.qty,
          notes: `Stock IN · ${ref}`,
          photo_url: null,
          scanned_barcode: null,
        };
        const { error: insErr } = await supabase.from("entries").insert(newEntry);
        if (insErr) throw insErr;
      }
      // OUT with no matching entry → audit-only (movement recorded, available_qty=0, no entry mutated).

      return mv as MovementRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: movementsKeys.all });
      qc.invalidateQueries({ queryKey: entriesKeys.all });
    },
  });
}
