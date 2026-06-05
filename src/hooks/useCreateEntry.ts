import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { validateShelf } from "@/lib/shelf-validator";
import { createEntrySchema, type CreateEntryInput } from "@/lib/validators/entry";
import type { EntryInsert, EntryRow } from "@/types/entry";
import { entriesKeys } from "./useEntries";

/**
 * Create a captured entry — ports v0.1 saveEntry().
 *  - validates name/qty/text via createEntrySchema
 *  - validates the shelf and DERIVES zone_code + fixture_type from it
 *    (CLAUDE.md §5.2 auto-zone-derive — the shelf is the single source of truth)
 *  - sets created_by from the signed-in user (RLS: insert requires
 *    created_by = auth.uid())
 *  - assigned_code stays null; ITM codes are assigned later on the Barcodes screen
 */
export function useCreateEntry() {
  const qc = useQueryClient();
  return useMutation<EntryRow, Error, CreateEntryInput>({
    mutationFn: async (input) => {
      const v = createEntrySchema.parse(input);

      const shelf = validateShelf(v.shelfCode);
      if (!shelf.ok || !shelf.code || !shelf.zoneCode || !shelf.fixtureType) {
        throw new Error(`Invalid shelf code: ${v.shelfCode || "(empty)"}`);
      }

      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("You must be signed in to capture an entry.");

      const row: EntryInsert = {
        created_by: uid,
        zone_code: shelf.zoneCode,
        shelf_code: shelf.code,
        fixture_type: shelf.fixtureType,
        name: v.name,
        master_code: v.masterCode,
        assigned_code: null,
        defn: v.defn,
        category: v.category,
        qty: v.qty,
        notes: v.notes,
        photo_url: v.photoUrl,
        scanned_barcode: v.scannedBarcode,
      };

      const { data, error } = await supabase.from("entries").insert(row).select().single();
      if (error) throw error;
      return data as EntryRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: entriesKeys.all }),
  });
}
