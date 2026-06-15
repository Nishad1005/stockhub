import type { EntryRow } from "@/types/entry";

export interface SourceMatchQuery {
  shelfCode: string;
  itemCode: string | null;
  itemName: string;
}

/**
 * Find the entry at the source shelf that this transfer is moving — the v0.2
 * analogue of v0.1 checkSourceEntry(). Matches on shelf (more specific than
 * v0.1, which used zone) plus master code when known, else name (case-insensitive).
 * Returns the first match, or null (then the transfer is logged audit-only).
 */
export function findSourceEntry(
  entries: ReadonlyArray<EntryRow>,
  q: SourceMatchQuery,
): EntryRow | null {
  const shelf = (q.shelfCode || "").trim().toUpperCase();
  if (!shelf) return null;
  const name = (q.itemName || "").trim().toLowerCase();
  for (const e of entries) {
    if ((e.shelf_code || "").toUpperCase() !== shelf) continue;
    if (q.itemCode) {
      if (e.master_code === q.itemCode) return e;
    } else if (name && (e.name || "").trim().toLowerCase() === name) {
      return e;
    }
  }
  return null;
}
