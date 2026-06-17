import { describe, it, expect } from "vitest";
import { createMovementSchema } from "./movement";

const base = { type: "IN", itemName: "Foam", shelfCode: "Z3-S042", qty: "10", sourceOrDest: "Acme Supplies" };

describe("createMovementSchema", () => {
  it("accepts a valid movement and coerces qty", () => {
    const v = createMovementSchema.parse(base);
    expect(v.qty).toBe(10);
    expect(v.itemCode).toBeNull();
  });
  it("rejects a missing item name", () => {
    expect(() => createMovementSchema.parse({ ...base, itemName: "  " })).toThrow();
  });
  it("rejects qty of zero", () => {
    expect(() => createMovementSchema.parse({ ...base, qty: "0" })).toThrow();
  });
  it("rejects an invalid shelf", () => {
    expect(() => createMovementSchema.parse({ ...base, shelfCode: "NOPE" })).toThrow();
  });
  it("rejects a missing source/destination", () => {
    expect(() => createMovementSchema.parse({ ...base, sourceOrDest: "" })).toThrow();
  });
  it("rejects an unknown type", () => {
    expect(() => createMovementSchema.parse({ ...base, type: "SIDEWAYS" })).toThrow();
  });
});
