// src/lib/stockLevels.ts
import type { EntryRow } from "@/types/entry";

export interface ShelfQty {
  shelf: string;
  qty: number;
}
export interface ItemStock {
  code: string | null;
  name: string;
  total: number;
  byShelf: ShelfQty[];
}

/** Per-item live stock from entries (identity: master → assigned → name). */
export function rollUpStock(entries: ReadonlyArray<EntryRow>): ItemStock[] {
  const map = new Map<string, { code: string | null; name: string; total: number; shelves: Map<string, number> }>();
  for (const e of entries) {
    const code = e.master_code ?? e.assigned_code ?? null;
    const key = code ?? `name:${(e.name || "").trim().toLowerCase()}`;
    const qty = e.qty ?? 0;
    let it = map.get(key);
    if (!it) {
      it = { code, name: e.name, total: 0, shelves: new Map() };
      map.set(key, it);
    }
    it.total += qty;
    it.shelves.set(e.shelf_code, (it.shelves.get(e.shelf_code) ?? 0) + qty);
  }
  return [...map.values()]
    .map((it) => ({
      code: it.code,
      name: it.name,
      total: it.total,
      byShelf: [...it.shelves.entries()]
        .map(([shelf, qty]) => ({ shelf, qty }))
        .sort((a, b) => a.shelf.localeCompare(b.shelf)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export interface EmptyLocation {
  code: string | null;
  name: string;
  shelf: string;
}

/** Depleted item-locations: entries whose qty is exactly 0. */
export function emptyLocations(entries: ReadonlyArray<EntryRow>): EmptyLocation[] {
  return entries
    .filter((e) => e.qty === 0)
    .map((e) => ({ code: e.master_code ?? e.assigned_code ?? null, name: e.name, shelf: e.shelf_code }));
}

export interface Discrepancy {
  id: string;
  ref: string;
  name: string;
  shelf: string;
  requested: number;
  available: number;
  shortfall: number;
  created_at: string;
}

/** Minimal movement shape discrepancies() needs (MovementRow satisfies it structurally). */
export interface DiscrepancySource {
  id: string;
  ref_number: string;
  item_name: string;
  shelf_code: string;
  qty: number;
  available_qty: number | null;
  type: string;
  created_at: string;
}

/** OUT movements where the issued qty exceeded the recorded on-hand, newest first. */
export function discrepancies(movements: ReadonlyArray<DiscrepancySource>): Discrepancy[] {
  return movements
    .filter((mv) => mv.type === "OUT" && mv.available_qty != null && mv.qty > mv.available_qty)
    .map((mv) => {
      const available = mv.available_qty as number;
      return {
        id: mv.id,
        ref: mv.ref_number,
        name: mv.item_name,
        shelf: mv.shelf_code,
        requested: mv.qty,
        available,
        shortfall: mv.qty - available,
        created_at: mv.created_at,
      };
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}
