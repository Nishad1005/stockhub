import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { validateShelf } from "@/lib/shelf-validator";
import { createTransferSchema, type CreateTransferInput } from "@/lib/validators/transfer";
import type { TransferRow, TransferInsert } from "@/types/transfer";
import type { EntryInsert } from "@/types/entry";
import { entriesKeys } from "./useEntries";
import { transfersKeys } from "./useTransfers";

export interface CreateTransferArgs {
  input: CreateTransferInput;
  /** Source entry to decrement (from findSourceEntry in the modal), or null. */
  sourceEntryId: string | null;
}

/**
 * Record a transfer — ports v0.1 saveTransfer(). Moves the stock (the user chose
 * this): inserts an STN transfer row, decrements the matched source entry, and
 * creates a destination entry so the item shows at its new shelf in Items/Find.
 * Zones are derived from the scanned shelves (CLAUDE.md §5.2). STN comes from the
 * server-side next_stn_number() sequence (monotonic across devices).
 */
export function useCreateTransfer() {
  const qc = useQueryClient();
  return useMutation<TransferRow, Error, CreateTransferArgs>({
    mutationFn: async ({ input, sourceEntryId }) => {
      const v = createTransferSchema.parse(input);

      const src = validateShelf(v.sourceShelf);
      const dst = validateShelf(v.destShelf);
      if (!src.ok || !src.code || !src.zoneCode || !dst.ok || !dst.code || !dst.zoneCode || !dst.fixtureType) {
        throw new Error("Invalid source or destination shelf code");
      }

      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("You must be signed in to record a transfer.");

      // 1. STN number (server sequence)
      const { data: stn, error: stnErr } = await supabase.rpc("next_stn_number");
      if (stnErr) throw stnErr;
      if (!stn) throw new Error("No STN number returned by next_stn_number()");

      // 2. Insert the transfer (audit record)
      const row: TransferInsert = {
        created_by: uid,
        stn_number: stn,
        item_code: v.itemCode,
        item_name: v.itemName,
        item_defn: v.itemDefn,
        item_category: v.itemCategory,
        source_zone: src.zoneCode,
        source_shelf: src.code,
        dest_zone: dst.zoneCode,
        dest_shelf: dst.code,
        qty: v.qty,
        reason: v.reason,
        storekeeper: v.storekeeper,
        helper: v.helper,
        source_deducted: !!sourceEntryId,
        notes: null,
      };
      const { data: tr, error: trErr } = await supabase.from("transfers").insert(row).select().single();
      if (trErr) throw trErr;

      // 3. Decrement the source entry (only when one was matched and it has a qty)
      if (sourceEntryId) {
        const { data: srcEntry } = await supabase
          .from("entries")
          .select("qty")
          .eq("id", sourceEntryId)
          .single();
        if (srcEntry && srcEntry.qty != null) {
          const newQty = Math.max(0, srcEntry.qty - v.qty);
          const { error: decErr } = await supabase.from("entries").update({ qty: newQty }).eq("id", sourceEntryId);
          if (decErr) throw decErr;
        }
      }

      // 4. Create the destination entry (so the item shows at its new shelf)
      const destEntry: EntryInsert = {
        created_by: uid,
        zone_code: dst.zoneCode,
        shelf_code: dst.code,
        fixture_type: dst.fixtureType,
        name: v.itemName,
        master_code: v.itemCode,
        assigned_code: null,
        defn: v.itemDefn,
        category: v.itemCategory,
        qty: v.qty,
        notes: `Transferred from ${src.code} · ${stn}`,
        photo_url: null,
        scanned_barcode: null,
      };
      const { error: destErr } = await supabase.from("entries").insert(destEntry);
      if (destErr) throw destErr;

      return tr as TransferRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: transfersKeys.all });
      qc.invalidateQueries({ queryKey: entriesKeys.all });
    },
  });
}
