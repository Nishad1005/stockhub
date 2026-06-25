import { describe, it, expect } from "vitest";
import { shelvesCoverage } from "./shelvesCoverage";

describe("shelvesCoverage", () => {
  it("groups by zone, sorts ascending, and totals", () => {
    const rows = [
      { zone_code: "Z02" }, { zone_code: "Z01" }, { zone_code: "Z01" },
      { zone_code: "Z02" }, { zone_code: "Z02" },
    ];
    const r = shelvesCoverage(rows);
    expect(r.total).toBe(5);
    expect(r.zones).toEqual([
      { zoneCode: "Z01", count: 2 },
      { zoneCode: "Z02", count: 3 },
    ]);
  });

  it("empty input → no zones, zero total", () => {
    expect(shelvesCoverage([])).toEqual({ zones: [], total: 0 });
  });
});
