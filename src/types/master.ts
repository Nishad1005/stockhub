/** A master catalog item — mirrors the `master_items` table 1:1. */
export interface MasterItem {
  code: string;             // StockHub catalog code, e.g. "ITM-00042"
  name: string;             // product name (v0.1 `p`)
  definition: string | null; // item type, e.g. "Foam" (v0.1 `d`)
  category: string | null;  // cleaned 6-value taxonomy, e.g. "Raw Material"
  section: string | null;   // logical home area (13 values), e.g. "Foam & Cushioning"
  unit: string | null;      // e.g. "roll", "pc", "m"
  sku: string | null;       // factory ERP "Product Code", e.g. "UM-000106"
}
