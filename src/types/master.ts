/** A master catalog item — mirrors the `master_items` table 1:1. */
export interface MasterItem {
  code: string;             // StockHub catalog code, e.g. "ITM-00042"
  name: string;             // product name (v0.1 `p`)
  definition: string | null; // item type, e.g. "Foam" (v0.1 `d`)
  category: string | null;  // from factory Category column (may be pipe-delimited)
  unit: string | null;      // e.g. "roll", "pc", "m"
  sku: string | null;       // factory ERP "Product Code", e.g. "UM-000106"
}
