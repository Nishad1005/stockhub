import { useMemo } from "react";
import { useMasterItems } from "./useMasterItems";
import { useDebouncedValue } from "./useDebouncedValue";
import { searchMaster, MASTER_MIN_QUERY } from "@/lib/masterSearch";
import type { MasterItem } from "@/types/master";

export interface UseMasterSearchResult {
  results: MasterItem[];
  /** True while the master catalog is still loading from Supabase. */
  isLoading: boolean;
  error: Error | null;
  /** The debounced query actually used for the current results. */
  query: string;
  /** True when the (debounced) query is below the 4-char minimum. */
  tooShort: boolean;
}

/**
 * Debounced fuzzy search over the master catalog — the v0.2 equivalent of
 * v0.1's name-input typeahead. Mirrors `searchMaster` semantics exactly.
 */
export function useMasterSearch(
  query: string,
  opts: { debounceMs?: number; limit?: number } = {},
): UseMasterSearchResult {
  const { debounceMs = 150, limit } = opts;
  const debounced = useDebouncedValue(query, debounceMs);
  const { data: items = [], isLoading, error } = useMasterItems();

  const results = useMemo(
    () => searchMaster(items, debounced, limit),
    [items, debounced, limit],
  );

  return {
    results,
    isLoading,
    error: (error as Error) ?? null,
    query: debounced,
    tooShort: debounced.trim().length < MASTER_MIN_QUERY,
  };
}
