import type { FixtureType } from "@/constants/shelf";
import type { Database } from "./database";

/** Generated row/insert/update shapes — the single source of truth for the DB. */
export type EntryRow = Database["public"]["Tables"]["entries"]["Row"];
export type EntryInsert = Database["public"]["Tables"]["entries"]["Insert"];
export type EntryUpdate = Database["public"]["Tables"]["entries"]["Update"];

/** A captured stock entry — matches the `entries` table 1:1. */
export interface Entry {
  id: string;
  created_at: string;        // ISO
  updated_at: string;
  created_by: string;        // user uuid
  zone_code: string;         // e.g. "Z03"
  shelf_code: string;        // e.g. "Z3-S042"
  fixture_type: FixtureType;
  name: string;
  master_code: string | null; // FK to master_items.code if matched
  assigned_code: string | null;
  defn: string | null;
  category: string | null;
  qty: number | null;
  notes: string | null;
  photo_url: string | null;
  scanned_barcode: string | null;
}
