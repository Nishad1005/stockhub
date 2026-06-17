import { describe, it, expect } from "vitest";
import { csvSafe, buildEntriesCsv, buildTransfersCsv } from "./csv";
import type { EntryRow } from "@/types/entry";
import type { TransferRow } from "@/types/transfer";

// created_at: null keeps the Date column deterministic ("" — no locale/TZ noise).
const entry = (p: Partial<EntryRow>): EntryRow =>
  ({
    id: "1", created_at: null, updated_at: null, created_by: "u1",
    zone_code: "Z03", shelf_code: "Z3-S042", fixture_type: "S",
    name: "Foam", master_code: null, assigned_code: null,
    defn: null, category: null, qty: null, notes: null,
    photo_url: null, scanned_barcode: null, ...p,
  }) as unknown as EntryRow;

const transfer = (p: Partial<TransferRow>): TransferRow =>
  ({
    id: "t1", created_at: null, created_by: "u1", stn_number: "STN/2026-06/0001",
    item_code: null, item_name: "Foam", item_defn: null, item_category: null,
    source_zone: "Z03", source_shelf: "Z3-S001", dest_zone: "Z04", dest_shelf: "Z4-S002",
    qty: 5, reason: null, storekeeper: null, helper: null, source_deducted: true, notes: null, ...p,
  }) as unknown as TransferRow;

const lookups = { zoneName: () => "FABRIC", section: () => "Foam & Cushioning" };

describe("csvSafe", () => {
  it("passes plain values through", () => {
    expect(csvSafe("plain")).toBe("plain");
    expect(csvSafe(5)).toBe("5");
    expect(csvSafe(null)).toBe("");
  });
  it("quotes values with comma / quote / newline and doubles quotes", () => {
    expect(csvSafe("a,b")).toBe('"a,b"');
    expect(csvSafe('he "hi"')).toBe('"he ""hi"""');
    expect(csvSafe("l1\nl2")).toBe('"l1\nl2"');
  });
});

describe("buildEntriesCsv", () => {
  it("emits the header and one escaped row, EXISTING when master-matched", () => {
    const csv = buildEntriesCsv(
      [entry({ name: "Foam, Platinum", master_code: "ITM-00042", defn: "40 density", category: "Raw Material", qty: 5 })],
      lookups,
    );
    const lines = csv.split("\n");
    expect(lines[0]).toBe(
      "Date,Zone Code,Zone Name,Shelf Code,Fixture Type,Master Code,Assigned Code,Match Status,Item Name,Definition,Category,Notes,Quantity,Scanned Barcode,Home Section",
    );
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe(
      ',Z03,FABRIC,Z3-S042,Shelf,ITM-00042,,EXISTING,"Foam, Platinum",40 density,Raw Material,,5,,Foam & Cushioning',
    );
  });
  it("marks NEW when there is no master code, and header-only on empty input", () => {
    expect(buildEntriesCsv([entry({})], lookups).split("\n")[1]).toContain(",NEW,");
    expect(buildEntriesCsv([], lookups).split("\n")).toHaveLength(1);
  });
});

describe("buildTransfersCsv", () => {
  it("emits header + row with YES/NO source-deducted", () => {
    const csv = buildTransfersCsv([transfer({ qty: 5, source_deducted: true })]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe(
      "Date,STN Number,Item Code,Item Name,Definition,Category,From Zone,From Shelf,To Zone,To Shelf,Quantity,Source Deducted,Reason,Storekeeper,Helper",
    );
    expect(lines[1]).toBe(",STN/2026-06/0001,,Foam,,,Z03,Z3-S001,Z04,Z4-S002,5,YES,,,");
    expect(buildTransfersCsv([transfer({ source_deducted: false })]).split("\n")[1]).toContain(",NO,");
  });
});
