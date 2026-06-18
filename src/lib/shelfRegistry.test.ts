import { describe, it, expect } from "vitest";
import { buildShelfCodeSet, isKnownShelf } from "./shelfRegistry";

describe("shelfRegistry", () => {
  const set = buildShelfCodeSet([{ code: "Z1-S001" }, { code: "z2-g005" }]);

  it("normalizes codes to uppercase in the set", () => {
    expect(set.has("Z1-S001")).toBe(true);
    expect(set.has("Z2-G005")).toBe(true);
  });

  it("matches known codes case/space-insensitively", () => {
    expect(isKnownShelf(set, "z1-s001")).toBe(true);
    expect(isKnownShelf(set, "  Z2-G005 ")).toBe(true);
  });

  it("rejects unknown or empty codes", () => {
    expect(isKnownShelf(set, "Z9-S999")).toBe(false);
    expect(isKnownShelf(set, "")).toBe(false);
  });
});
