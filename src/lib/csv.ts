import type { EntryRow } from "@/types/entry";
import type { TransferRow } from "@/types/transfer";

const FIXTURE_LABEL: Record<string, string> = { S: "Shelf", G: "Ghoda Fixture", P: "Pallet", R: "Rack" };

/** Quote a CSV field if it contains a comma, quote, or newline (RFC-4180). */
export function csvSafe(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export interface EntryCsvLookups {
  zoneName: (zoneCode: string) => string;
  section: (entry: EntryRow) => string;
}

const ENTRY_HEADERS = [
  "Date", "Zone Code", "Zone Name", "Shelf Code", "Fixture Type", "Master Code", "Assigned Code",
  "Match Status", "Item Name", "Definition", "Category", "Notes", "Quantity", "Scanned Barcode", "Home Section",
];

export function buildEntriesCsv(entries: ReadonlyArray<EntryRow>, lookups: EntryCsvLookups): string {
  const rows = entries.map((e) => [
    csvSafe(e.created_at ? new Date(e.created_at).toLocaleString() : ""),
    csvSafe(e.zone_code),
    csvSafe(lookups.zoneName(e.zone_code)),
    csvSafe(e.shelf_code),
    csvSafe(FIXTURE_LABEL[e.fixture_type] ?? ""),
    csvSafe(e.master_code ?? ""),
    csvSafe(e.assigned_code ?? ""),
    e.master_code ? "EXISTING" : "NEW",
    csvSafe(e.name),
    csvSafe(e.defn ?? ""),
    csvSafe(e.category ?? ""),
    csvSafe(e.notes ?? ""),
    e.qty != null ? String(e.qty) : "",
    csvSafe(e.scanned_barcode ?? ""),
    csvSafe(lookups.section(e)),
  ]);
  return [ENTRY_HEADERS, ...rows].map((r) => r.join(",")).join("\n");
}

const TRANSFER_HEADERS = [
  "Date", "STN Number", "Item Code", "Item Name", "Definition", "Category", "From Zone", "From Shelf",
  "To Zone", "To Shelf", "Quantity", "Source Deducted", "Reason", "Storekeeper", "Helper",
];

export function buildTransfersCsv(transfers: ReadonlyArray<TransferRow>): string {
  const rows = transfers.map((t) => [
    csvSafe(t.created_at ? new Date(t.created_at).toLocaleString() : ""),
    csvSafe(t.stn_number),
    csvSafe(t.item_code ?? ""),
    csvSafe(t.item_name),
    csvSafe(t.item_defn ?? ""),
    csvSafe(t.item_category ?? ""),
    csvSafe(t.source_zone),
    csvSafe(t.source_shelf),
    csvSafe(t.dest_zone),
    csvSafe(t.dest_shelf),
    t.qty != null ? String(t.qty) : "",
    t.source_deducted ? "YES" : "NO",
    csvSafe(t.reason ?? ""),
    csvSafe(t.storekeeper ?? ""),
    csvSafe(t.helper ?? ""),
  ]);
  return [TRANSFER_HEADERS, ...rows].map((r) => r.join(",")).join("\n");
}

/** Trigger a browser download of a CSV string (UTF-8 BOM so Excel reads Devanagari). */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
