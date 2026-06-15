import { describe, it, expect } from "vitest";
import { findSourceEntry } from "./transferMatch";
import type { EntryRow } from "@/types/entry";

const mk = (p: Partial<EntryRow> & { id: string }): EntryRow =>
  ({
    created_at: "2026-06-15T00:00:00Z",
    updated_at: "2026-06-15T00:00:00Z",
    created_by: "u1",
    zone_code: "Z01",
    shelf_code: "Z1-S001",
    fixture_type: "S",
    name: "Thread Mara 30",
    master_code: null,
    assigned_code: null,
    defn: null,
    category: null,
    qty: null,
    notes: null,
    photo_url: null,
    scanned_barcode: null,
    ...p,
  }) as EntryRow;

describe("findSourceEntry", () => {
  const entries = [
    mk({ id: "a", shelf_code: "Z1-S001", master_code: "ITM-00042", name: "Foam" }),
    mk({ id: "b", shelf_code: "Z1-S001", master_code: null, name: "Loose Cloth" }),
    mk({ id: "c", shelf_code: "Z2-S009", master_code: "ITM-00042", name: "Foam" }),
  ];

  it("matches on shelf + master code", () => {
    expect(findSourceEntry(entries, { shelfCode: "Z1-S001", itemCode: "ITM-00042", itemName: "Foam" })?.id).toBe("a");
  });

  it("matches on shelf + name when there is no code", () => {
    expect(findSourceEntry(entries, { shelfCode: "Z1-S001", itemCode: null, itemName: "loose cloth" })?.id).toBe("b");
  });

  it("returns null when nothing on that shelf matches", () => {
    expect(findSourceEntry(entries, { shelfCode: "Z9-S099", itemCode: "ITM-00042", itemName: "Foam" })).toBeNull();
  });
});
