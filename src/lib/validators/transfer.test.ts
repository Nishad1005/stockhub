import { describe, it, expect } from "vitest";
import { createTransferSchema } from "./transfer";

const base = {
  itemName: "Foam Platinum",
  sourceShelf: "Z1-S001",
  destShelf: "Z2-S012",
  qty: "5",
};

describe("createTransferSchema", () => {
  it("accepts a valid transfer and coerces qty to a number", () => {
    const v = createTransferSchema.parse(base);
    expect(v.qty).toBe(5);
    expect(v.itemCode).toBeNull();
  });

  it("rejects a missing item name", () => {
    expect(() => createTransferSchema.parse({ ...base, itemName: "   " })).toThrow();
  });

  it("rejects qty of zero", () => {
    expect(() => createTransferSchema.parse({ ...base, qty: "0" })).toThrow();
  });

  it("rejects an invalid shelf code", () => {
    expect(() => createTransferSchema.parse({ ...base, destShelf: "NOPE" })).toThrow();
  });

  it("rejects identical source and destination", () => {
    expect(() => createTransferSchema.parse({ ...base, destShelf: "z1-s001" })).toThrow();
  });
});
