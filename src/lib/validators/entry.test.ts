import { describe, it, expect } from "vitest";
import {
  createEntrySchema,
  updateEntryPatchSchema,
  entryQty,
  requiredName,
  optionalText,
} from "./entry";

describe("entryQty (v0.1 parseInt parity)", () => {
  it("treats blank as null", () => {
    expect(entryQty.parse("")).toBeNull();
    expect(entryQty.parse(null)).toBeNull();
    expect(entryQty.parse(undefined)).toBeNull();
  });
  it("parses integers", () => {
    expect(entryQty.parse("5")).toBe(5);
    expect(entryQty.parse(0)).toBe(0);
  });
  it("truncates like parseInt (5.9 -> 5)", () => {
    expect(entryQty.parse("5.9")).toBe(5);
    expect(entryQty.parse(5.9)).toBe(5);
  });
  it("rejects negatives and non-numbers", () => {
    expect(() => entryQty.parse("-1")).toThrow();
    expect(() => entryQty.parse("abc")).toThrow();
  });
});

describe("requiredName / optionalText", () => {
  it("requires a non-empty trimmed name", () => {
    expect(requiredName.parse("  Foam ")).toBe("Foam");
    expect(() => requiredName.parse("   ")).toThrow();
  });
  it("trims optional text and blanks become null", () => {
    expect(optionalText.parse("  x ")).toBe("x");
    expect(optionalText.parse("")).toBeNull();
    expect(optionalText.parse(null)).toBeNull();
    expect(optionalText.parse(undefined)).toBeNull();
  });
});

describe("createEntrySchema", () => {
  it("normalizes a full capture payload", () => {
    const v = createEntrySchema.parse({
      shelfCode: "Z3-S042",
      name: "  Packing Foam ",
      qty: "10",
      masterCode: "ITM-00335",
      defn: " Thread ",
      category: "",
      notes: undefined,
    });
    expect(v).toMatchObject({
      shelfCode: "Z3-S042",
      name: "Packing Foam",
      qty: 10,
      masterCode: "ITM-00335",
      defn: "Thread",
      category: null,
      notes: null,
      scannedBarcode: null,
      photoUrl: null,
    });
  });

  it("requires name and shelfCode", () => {
    expect(() => createEntrySchema.parse({ shelfCode: "Z3-S042", name: " " })).toThrow();
    expect(() => createEntrySchema.parse({ shelfCode: "", name: "X" })).toThrow();
  });
});

describe("updateEntryPatchSchema", () => {
  it("allows partial patches and rejects unknown keys", () => {
    expect(updateEntryPatchSchema.parse({ qty: "3" })).toEqual({ qty: 3 });
    expect(updateEntryPatchSchema.parse({ notes: "" })).toEqual({ notes: null });
    expect(() => updateEntryPatchSchema.parse({ masterCode: "ITM-1" })).toThrow();
  });
});
