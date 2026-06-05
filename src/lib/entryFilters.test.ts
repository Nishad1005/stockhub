import { describe, it, expect } from "vitest";
import { filterEntries, entryCounts, DEFAULT_ENTRY_FILTERS } from "./entryFilters";

type E = { zone_code: string; master_code: string | null };

const ENTRIES: E[] = [
  { zone_code: "Z01", master_code: "ITM-00001" }, // existing
  { zone_code: "Z01", master_code: null }, // new
  { zone_code: "Z03", master_code: null }, // new
  { zone_code: "Z03", master_code: "ITM-00042" }, // existing
];

describe("filterEntries (v0.1 parity)", () => {
  it("returns everything with the default filters", () => {
    expect(filterEntries(ENTRIES, DEFAULT_ENTRY_FILTERS)).toHaveLength(4);
  });

  it("filters by zone", () => {
    expect(filterEntries(ENTRIES, { zone: "Z01", status: "all" })).toHaveLength(2);
  });

  it("filters new (no master) vs existing (has master)", () => {
    expect(filterEntries(ENTRIES, { zone: "all", status: "new" })).toHaveLength(2);
    expect(filterEntries(ENTRIES, { zone: "all", status: "existing" })).toHaveLength(2);
  });

  it("combines zone + status", () => {
    const r = filterEntries(ENTRIES, { zone: "Z03", status: "existing" });
    expect(r).toEqual([{ zone_code: "Z03", master_code: "ITM-00042" }]);
  });
});

describe("entryCounts", () => {
  it("counts totals, new/existing, and per-zone", () => {
    const c = entryCounts(ENTRIES);
    expect(c.total).toBe(4);
    expect(c.newItems).toBe(2);
    expect(c.existing).toBe(2);
    expect(c.byZone).toEqual({ Z01: 2, Z03: 2 });
  });
});
