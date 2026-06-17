import type { EntryRow } from "@/types/entry";
import type { MovementRow } from "@/types/movement";
import type { TransferRow } from "@/types/transfer";

export interface ItemSelector {
  code: string | null;
  name: string;
}

/**
 * True when a record (its code + name) is the selected item. Matches by code
 * when the selector has one, and always accepts a case-insensitive name match
 * (so NEW / assigned-code items, whose movements carry no master code, still
 * match). Two items sharing an identical name would co-match — acceptable here.
 */
export function sameItem(code: string | null, name: string, sel: ItemSelector): boolean {
  if (sel.code != null && code === sel.code) return true;
  return (name || "").trim().toLowerCase() === (sel.name || "").trim().toLowerCase();
}

/** The item's entries (one per location), sorted by shelf code. */
export function itemLocations(entries: ReadonlyArray<EntryRow>, sel: ItemSelector): EntryRow[] {
  return entries
    .filter((e) => sameItem(e.master_code ?? e.assigned_code, e.name, sel))
    .sort((a, b) => a.shelf_code.localeCompare(b.shelf_code));
}

export interface ActivityItem {
  id: string;
  kind: "IN" | "OUT" | "TRANSFER";
  ref: string;
  when: string;
  summary: string;
}

/** Merged movement + transfer activity for the item, newest first, capped at `limit`. */
export function itemActivity(
  movements: ReadonlyArray<MovementRow>,
  transfers: ReadonlyArray<TransferRow>,
  sel: ItemSelector,
  limit = 8,
): ActivityItem[] {
  const fromMovements: ActivityItem[] = movements
    .filter((m) => sameItem(m.item_code, m.item_name, sel))
    .map((m) => ({
      id: m.id,
      kind: m.type === "IN" ? "IN" : "OUT",
      ref: m.ref_number,
      when: m.created_at,
      summary: `${m.qty} @ ${m.shelf_code}`,
    }));
  const fromTransfers: ActivityItem[] = transfers
    .filter((t) => sameItem(t.item_code, t.item_name, sel))
    .map((t) => ({
      id: t.id,
      kind: "TRANSFER" as const,
      ref: t.stn_number,
      when: t.created_at,
      summary: `${t.qty}: ${t.source_shelf} → ${t.dest_shelf}`,
    }));
  return [...fromMovements, ...fromTransfers]
    .sort((a, b) => b.when.localeCompare(a.when))
    .slice(0, limit);
}
