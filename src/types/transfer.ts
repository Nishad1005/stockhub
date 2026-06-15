import type { Database } from "./database";

/** Generated row/insert shapes — the single source of truth for the DB. */
export type TransferRow = Database["public"]["Tables"]["transfers"]["Row"];
export type TransferInsert = Database["public"]["Tables"]["transfers"]["Insert"];

/** A stock transfer between two locations — matches the `transfers` table. */
export interface Transfer {
  id: string;
  created_at: string;
  created_by: string;
  stn_number: string;          // e.g. "STN/2026-06/0042"
  item_code: string | null;
  item_name: string;
  item_defn: string | null;
  item_category: string | null;
  source_zone: string;
  source_shelf: string;
  dest_zone: string;
  dest_shelf: string;
  qty: number;
  reason: string | null;
  storekeeper: string | null;
  helper: string | null;
  source_deducted: boolean;
  notes: string | null;
}
