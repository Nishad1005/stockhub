import { describe, it, expect } from "vitest";
import { searchMaster, MASTER_MIN_QUERY } from "./masterSearch";
import type { MasterItem } from "@/types/master";

const mk = (p: Partial<MasterItem> & { code: string; name: string }): MasterItem => ({
  definition: null,
  category: null,
  unit: null,
  sku: null,
  ...p,
});

const ITEMS: MasterItem[] = [
  mk({ code: "ITM-00335", name: "Thread 702404-3796 Mara 30 300m (Roll)", definition: "Thread", sku: "UM-000106" }),
  mk({ code: "ITM-00091", name: "Foam LOUNGE CHAIRS MOULDED FOAM", definition: "Foam" }),
  mk({ code: "ITM-01131", name: "Leather EL-PASO - COFFEE", definition: "Leather", sku: "UNMPL/SKU/25-26/152" }),
  mk({ code: "ITM-00224", name: "Sanding Paper Mirka 80 NO.", definition: "Sanding Paper", sku: "MM-01880" }),
];

describe("searchMaster (v0.1 parity)", () => {
  it("returns [] under the 4-char minimum", () => {
    expect(searchMaster(ITEMS, "foa")).toEqual([]);
    expect("foa".length).toBeLessThan(MASTER_MIN_QUERY);
  });

  it("matches name, case-insensitively", () => {
    const r = searchMaster(ITEMS, "lounge");
    expect(r.map((i) => i.code)).toContain("ITM-00091");
  });

  it("matches the ITM code", () => {
    const r = searchMaster(ITEMS, "ITM-00224");
    expect(r[0].code).toBe("ITM-00224");
  });

  it("matches the factory ERP sku", () => {
    const r = searchMaster(ITEMS, "UM-000106");
    expect(r[0].code).toBe("ITM-00335");
  });

  it("ranks startsWith above includes", () => {
    const items: MasterItem[] = [
      mk({ code: "ITM-1", name: "Premium Thread" }), // 'THREAD' is a substring
      mk({ code: "ITM-2", name: "Thread spool" }), // starts with 'THREAD'
    ];
    const r = searchMaster(items, "thread");
    expect(r.map((i) => i.code)).toEqual(["ITM-2", "ITM-1"]);
  });

  it("caps results at the limit", () => {
    const many = Array.from({ length: 50 }, (_, i) =>
      mk({ code: `ITM-${i}`, name: `Foam sheet ${i}` }),
    );
    expect(searchMaster(many, "foam").length).toBe(12);
    expect(searchMaster(many, "foam", 5).length).toBe(5);
  });
});
