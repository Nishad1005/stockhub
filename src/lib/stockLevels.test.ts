import { describe, it, expect } from "vitest";
import { rollUpStock, emptyLocations, discrepancies } from "./stockLevels";
import type { EntryRow } from "@/types/entry";

// Local shape for discrepancies() — keeps this task independent of the movement types task.
type Mv = {
  id: string; created_at: string; type: "IN" | "OUT"; ref_number: string;
  item_name: string; shelf_code: string; qty: number; available_qty: number | null;
};

const e = (p: Partial<EntryRow>): EntryRow =>
  ({
    id: "e", created_at: "2026-06-18T00:00:00Z", updated_at: "2026-06-18T00:00:00Z", created_by: "u1",
    zone_code: "Z03", shelf_code: "Z3-S001", fixture_type: "S", name: "Foam",
    master_code: null, assigned_code: null, defn: null, category: null,
    qty: 0, notes: null, photo_url: null, scanned_barcode: null, ...p,
  }) as unknown as EntryRow;

const m = (p: Partial<Mv>): Mv => ({
  id: "m", created_at: "2026-06-18T00:00:00Z", type: "OUT",
  ref_number: "MIR/2026-06/0001", item_name: "Foam", shelf_code: "Z3-S001",
  qty: 8, available_qty: 5, ...p,
});

describe("rollUpStock", () => {
  it("groups by item across shelves and sums, with per-shelf breakdown", () => {
    const out = rollUpStock([
      e({ id: "1", master_code: "ITM-1", name: "Foam", shelf_code: "Z3-S001", qty: 5 }),
      e({ id: "2", master_code: "ITM-1", name: "Foam", shelf_code: "Z4-S002", qty: 3 }),
      e({ id: "3", master_code: null, assigned_code: null, name: "Loose Cloth", shelf_code: "Z3-S001", qty: 2 }),
    ]);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({
      code: "ITM-1",
      name: "Foam",
      total: 8,
      byShelf: [{ shelf: "Z3-S001", qty: 5 }, { shelf: "Z4-S002", qty: 3 }],
    });
    expect(out[1].name).toBe("Loose Cloth"); // grouped by name when no code
    expect(out[1].code).toBeNull();
  });
});

describe("emptyLocations", () => {
  it("returns only entries whose qty is exactly 0", () => {
    const out = emptyLocations([
      e({ id: "1", master_code: "ITM-1", name: "Foam", shelf_code: "Z3-S001", qty: 0 }),
      e({ id: "2", name: "Wood", shelf_code: "Z4-S002", qty: 4 }),
      e({ id: "3", name: "Glue", shelf_code: "Z5-S003", qty: null }),
    ]);
    expect(out).toEqual([{ code: "ITM-1", name: "Foam", shelf: "Z3-S001" }]);
  });
});

describe("discrepancies", () => {
  it("returns OUT movements where requested exceeds available, newest first", () => {
    const out = discrepancies([
      m({ id: "a", qty: 8, available_qty: 5, created_at: "2026-06-18T08:00:00Z" }),
      m({ id: "b", type: "IN", qty: 9, available_qty: null }),
      m({ id: "c", qty: 3, available_qty: 5, created_at: "2026-06-18T09:00:00Z" }), // within stock
      m({ id: "d", qty: 10, available_qty: 4, created_at: "2026-06-18T10:00:00Z" }),
    ]);
    expect(out.map((x) => x.id)).toEqual(["d", "a"]);
    expect(out[1]).toMatchObject({ ref: "MIR/2026-06/0001", requested: 8, available: 5, shortfall: 3 });
  });
});
