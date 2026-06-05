/**
 * Entry list filtering + counts — ports v0.1's Items-screen filter bar.
 *
 * v0.1 semantics (renderItemsScreen):
 *  - zone filter: "all" or a specific zone code
 *  - status filter: "new" = no master code, "existing" = has master code
 */
import type { EntryRow } from "@/types/entry";

export type EntryStatusFilter = "all" | "new" | "existing";

export interface EntryFilters {
  zone: string; // "all" or a zone code like "Z03"
  status: EntryStatusFilter;
}

export const DEFAULT_ENTRY_FILTERS: EntryFilters = { zone: "all", status: "all" };

type FilterableEntry = Pick<EntryRow, "zone_code" | "master_code">;

export function filterEntries<T extends FilterableEntry>(entries: readonly T[], filters: EntryFilters): T[] {
  const { zone, status } = filters;
  return entries.filter((e) => {
    if (zone !== "all" && e.zone_code !== zone) return false;
    if (status === "new" && e.master_code) return false;
    if (status === "existing" && !e.master_code) return false;
    return true;
  });
}

export interface EntryCounts {
  total: number;
  newItems: number;
  existing: number;
  byZone: Record<string, number>;
}

export function entryCounts(entries: readonly FilterableEntry[]): EntryCounts {
  const byZone: Record<string, number> = {};
  let newItems = 0;
  let existing = 0;
  for (const e of entries) {
    byZone[e.zone_code] = (byZone[e.zone_code] || 0) + 1;
    if (e.master_code) existing++;
    else newItems++;
  }
  return { total: entries.length, newItems, existing, byZone };
}
