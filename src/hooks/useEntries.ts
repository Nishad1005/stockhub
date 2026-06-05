import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { EntryRow } from "@/types/entry";

export const entriesKeys = {
  all: ["entries"] as const,
};

const PAGE = 1000; // Supabase caps a single select at 1000 rows

async function fetchAllEntries(): Promise<EntryRow[]> {
  const all: EntryRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("entries")
      .select("*")
      .order("created_at", { ascending: true }) // v0.1 shows entries in capture order
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...(data as EntryRow[]));
    if (data.length < PAGE) break;
  }
  return all;
}

/**
 * All captured entries. v0.1 kept entries in memory and filtered client-side
 * (live filter-chip counts), so we fetch the full set and let callers filter via
 * `filterEntries()` / `entryCounts()` from `@/lib/entryFilters`.
 */
export function useEntries() {
  return useQuery({
    queryKey: entriesKeys.all,
    queryFn: fetchAllEntries,
  });
}
