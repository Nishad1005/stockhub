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
