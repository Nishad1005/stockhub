import { describe, it, expect } from "vitest";
import { zonesPresent } from "./barcodeZones";

describe("zonesPresent", () => {
  it("groups by zone_code, counts, and sorts ascending", () => {
    const rows = [
      { zone_code: "Z03" }, { zone_code: "Z01" }, { zone_code: "Z03" },
      { zone_code: "Z01" }, { zone_code: "Z03" },
    ];
    expect(zonesPresent(rows)).toEqual([
      { zone: "Z01", count: 2 },
      { zone: "Z03", count: 3 },
    ]);
  });

  it("empty input -> empty array", () => {
    expect(zonesPresent([])).toEqual([]);
  });
});
