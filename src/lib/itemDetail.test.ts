import { describe, it, expect } from "vitest";
import { sameItem, itemLocations, itemActivity } from "./itemDetail";
import type { EntryRow } from "@/types/entry";
import type { MovementRow } from "@/types/movement";
import type { TransferRow } from "@/types/transfer";

const e = (p: Partial<EntryRow>): EntryRow =>
  ({
    id: "e", created_at: "2026-06-18T00:00:00Z", updated_at: "2026-06-18T00:00:00Z", created_by: "u1",
    zone_code: "Z03", shelf_code: "Z3-S001", fixture_type: "S", name: "Foam",
    master_code: null, assigned_code: null, defn: null, category: null,
    qty: 0, notes: null, photo_url: null, scanned_barcode: null, ...p,
  }) as unknown as EntryRow;

const mv = (p: Partial<MovementRow>): MovementRow =>
  ({
    id: "m", created_at: "2026-06-18T00:00:00Z", created_by: "u1", type: "IN",
    ref_number: "GRN/2026-06/0001", item_code: "ITM-1", item_name: "Foam",
    shelf_code: "Z3-S001", zone_code: "Z03", fixture_type: "S", qty: 5,
    source_or_dest: "Acme", reason: null, authorized_by: null, notes: null, available_qty: null, ...p,
  }) as unknown as MovementRow;

const tr = (p: Partial<TransferRow>): TransferRow =>
  ({
    id: "t", created_at: "2026-06-18T00:00:00Z", created_by: "u1", stn_number: "STN/2026-06/0001",
    item_code: "ITM-1", item_name: "Foam", item_defn: null, item_category: null,
    source_zone: "Z03", source_shelf: "Z3-S001", dest_zone: "Z04", dest_shelf: "Z4-S002",
    qty: 2, reason: null, storekeeper: null, helper: null, source_deducted: true, notes: null, ...p,
  }) as unknown as TransferRow;

describe("sameItem", () => {
  it("matches by code, falls back to name (case-insensitive), and misses otherwise", () => {
    expect(sameItem("ITM-1", "Foam", { code: "ITM-1", name: "whatever" })).toBe(true);
    expect(sameItem(null, "Foam", { code: null, name: "foam" })).toBe(true);
    expect(sameItem(null, "Wood", { code: null, name: "Foam" })).toBe(false);
  });
});

describe("itemLocations", () => {
  it("returns the item's entries sorted by shelf", () => {
    const out = itemLocations(
      [
        e({ id: "1", master_code: "ITM-1", shelf_code: "Z4-S002", qty: 3 }),
        e({ id: "2", master_code: "ITM-1", shelf_code: "Z3-S001", qty: 5 }),
        e({ id: "3", master_code: "ITM-9", name: "Wood", shelf_code: "Z5-S003", qty: 1 }),
      ],
      { code: "ITM-1", name: "Foam" },
    );
    expect(out.map((x) => x.id)).toEqual(["2", "1"]);
  });
});

describe("itemActivity", () => {
  it("merges movements + transfers for the item, newest first, capped", () => {
    const out = itemActivity(
      [
        mv({ id: "a", type: "IN", qty: 5, shelf_code: "Z3-S001", ref_number: "GRN/2026-06/0001", created_at: "2026-06-18T08:00:00Z" }),
        mv({ id: "b", item_code: "ITM-9", item_name: "Wood", created_at: "2026-06-18T07:00:00Z" }),
      ],
      [tr({ id: "c", qty: 2, created_at: "2026-06-18T09:00:00Z" })],
      { code: "ITM-1", name: "Foam" },
      8,
    );
    expect(out.map((x) => [x.kind, x.id])).toEqual([["TRANSFER", "c"], ["IN", "a"]]);
    expect(out[0].summary).toBe("2: Z3-S001 → Z4-S002");
    expect(out[1].summary).toBe("5 @ Z3-S001");
  });
});
