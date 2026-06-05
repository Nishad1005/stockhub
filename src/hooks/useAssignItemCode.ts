import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { EntryRow } from "@/types/entry";
import { entriesKeys } from "./useEntries";

/**
 * Assign the next ITM code to a NEW entry (no master match). Uses the server-side
 * `next_item_code()` sequence so codes are monotonic across users/devices, then
 * persists it to entries.assigned_code (v0.2 stores it, unlike v0.1 which
 * recomputed client-side each render).
 */
export function useAssignItemCode() {
  const qc = useQueryClient();
  return useMutation<string, Error, string>({
    mutationFn: async (entryId) => {
      const { data: code, error } = await supabase.rpc("next_item_code");
      if (error) throw error;
      if (!code) throw new Error("No code returned by next_item_code()");

      const { error: upErr } = await supabase
        .from("entries")
        .update({ assigned_code: code })
        .eq("id", entryId)
        .is("assigned_code", null); // don't overwrite an existing code
      if (upErr) throw upErr;
      return code;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: entriesKeys.all }),
  });
}

/** True when an entry still needs a code (no master match, none assigned yet). */
export function entryNeedsCode(e: Pick<EntryRow, "master_code" | "assigned_code">): boolean {
  return !e.master_code && !e.assigned_code;
}

/** The effective code for an entry, or null if it still needs one. */
export function entryCode(e: Pick<EntryRow, "master_code" | "assigned_code">): string | null {
  return e.master_code ?? e.assigned_code ?? null;
}
