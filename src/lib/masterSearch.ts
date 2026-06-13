/**
 * Master search — pure port of v0.1 `searchMaster()`
 * (legacy/UM_Designs_StockHub.html ~line 1319).
 *
 * Parity rules preserved exactly:
 *  - query is upper-cased and trimmed
 *  - needs >= 4 chars, else returns []  (MASTER_MIN_QUERY)
 *  - "startsWith" matches rank above "includes" matches
 *  - capped at 12 results (MASTER_MAX_RESULTS), with the same early-out
 *
 * Extension over v0.1: also matches the factory ERP code (`sku`) in addition to
 * name / code / definition, since scanned barcodes encode the ERP code. This is
 * strictly looser than v0.1 (more things match), never stricter.
 */
import type { MasterItem } from "@/types/master";

export const MASTER_MIN_QUERY = 4;
export const MASTER_MAX_RESULTS = 12;

export function searchMaster(
  items: readonly MasterItem[],
  query: string,
  limit: number = MASTER_MAX_RESULTS,
): MasterItem[] {
  const q = query.toUpperCase().trim();
  if (q.length < MASTER_MIN_QUERY) return [];

  const starts: MasterItem[] = [];
  const contains: MasterItem[] = [];

  for (const it of items) {
    const name = (it.name || "").toUpperCase();
    const code = (it.code || "").toUpperCase();
    const sku = (it.sku || "").toUpperCase();
    const defn = (it.definition || "").toUpperCase();

    if (name.startsWith(q) || code.startsWith(q) || sku.startsWith(q) || defn.startsWith(q)) {
      starts.push(it);
    } else if (name.includes(q) || code.includes(q) || sku.includes(q) || defn.includes(q)) {
      contains.push(it);
    }
    if (starts.length >= limit) break; // v0.1 early-out once enough prefix hits
  }

  return [...starts, ...contains].slice(0, limit);
}

/**
 * Exact lookup for a scanned item barcode. Physical item labels encode the
 * StockHub code (e.g. "ITM-01132"), so we match `code` first, then fall back to
 * the factory ERP `sku`. Case-insensitive, whitespace-trimmed. Returns null if
 * nothing matches (caller treats it as a NEW, un-mastered item).
 */
export function findMasterByCode(
  items: readonly MasterItem[],
  raw: string | null | undefined,
): MasterItem | null {
  const q = String(raw ?? "").trim().toUpperCase();
  if (!q) return null;
  let skuHit: MasterItem | null = null;
  for (const it of items) {
    if ((it.code || "").toUpperCase() === q) return it;
    if (!skuHit && (it.sku || "").toUpperCase() === q) skuHit = it;
  }
  return skuHit;
}
