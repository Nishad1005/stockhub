import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { entriesKeys } from "./useEntries";

/**
 * Delete an entry — ports v0.1 deleteCurrentEntry().
 * Requires migration 0004 (entries DELETE policy); without it RLS silently
 * deletes 0 rows. Caller confirms + checks isEntryLocked() first.
 *
 * Cleanup of v0.1's client-side `assignedCodes` / `selectedForPrint` is handled
 * by the screens that own that state, not here.
 */
export function useDeleteEntry() {
  const qc = useQueryClient();
  return useMutation<string, Error, string>({
    mutationFn: async (id) => {
      const { error } = await supabase.from("entries").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: entriesKeys.all }),
  });
}
