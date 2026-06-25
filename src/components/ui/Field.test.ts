import { describe, it, expect } from "vitest";
import { inputClasses } from "./Field";

describe("inputClasses", () => {
  it("base is a rounded bordered field with focus ring", () => {
    const c = inputClasses();
    expect(c).toContain("rounded-xl");
    expect(c).toContain("border-brand-line");
    expect(c).toContain("focus:ring-2");
  });
  it("mono adds mono + uppercase styling", () => {
    expect(inputClasses({ mono: true })).toContain("font-mono");
    expect(inputClasses({ mono: true })).toContain("uppercase");
  });
  it("invalid swaps the border to bad", () => {
    expect(inputClasses({ invalid: true })).toContain("border-brand-bad");
  });
});
