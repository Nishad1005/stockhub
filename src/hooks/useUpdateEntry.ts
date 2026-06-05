import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { validateShelf } from "@/lib/shelf-validator";
import { updateEntryPatchSchema, type UpdateEntryPatchInput } from "@/lib/validators/entry";
import type { EntryRow, EntryUpdate } from "@/types/entry";
import { entriesKeys } from "./useEntries";

export interface UpdateEntryArgs {
  id: string;
  patch: UpdateEntryPatchInput;
}

/**
 * Update an entry — ports v0.1 saveEditModal().
 *  - only the editable fields (name, zone, shelf, qty, defn, category, notes)
 *  - re-validates the shelf and re-derives fixture_type; if the zone isn't
 *    explicitly set, it follows the shelf (keeps zone/shelf consistent)
 *  - does NOT touch created_at, master_code, or scanned_barcode (parity)
 *  - updated_at is bumped by the DB trigger
 *
 * Edit-lock is enforced by the caller via isEntryLocked() BEFORE calling this —
 * the lock can't live in RLS (per-device manager override, CLAUDE.md §11.4).
 */
export function useUpdateEntry() {
  const qc = useQueryClient();
  return useMutation<EntryRow, Error, UpdateEntryArgs>({
    mutationFn: async ({ id, patch }) => {
      const v = updateEntryPatchSchema.parse(patch);
      const update: EntryUpdate = {};

      if (v.name !== undefined) update.name = v.name;
      if (v.zoneCode !== undefined) update.zone_code = v.zoneCode;
      if (v.qty !== undefined) update.qty = v.qty;
      if (v.defn !== undefined) update.defn = v.defn;
      if (v.category !== undefined) update.category = v.category;
      if (v.notes !== undefined) update.notes = v.notes;

      if (v.shelfCode !== undefined) {
        const shelf = validateShelf(v.shelfCode);
        if (!shelf.ok || !shelf.code || !shelf.fixtureType) {
          throw new Error(`Invalid shelf code: ${v.shelfCode || "(empty)"}`);
        }
        update.shelf_code = shelf.code;
        update.fixture_type = shelf.fixtureType;
        if (v.zoneCode === undefined && shelf.zoneCode) {
          update.zone_code = shelf.zoneCode;
        }
      }

      if (Object.keys(update).length === 0) {
        throw new Error("Nothing to update.");
      }

      const { data, error } = await supabase
        .from("entries")
        .update(update)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as EntryRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: entriesKeys.all }),
  });
}
