import { describe, it, expect } from "vitest";
import { chipClasses } from "./Chip";

describe("chipClasses", () => {
  it("active is filled accent-2", () => {
    expect(chipClasses(true)).toContain("bg-brand-accent-2");
    expect(chipClasses(true)).toContain("text-white");
  });
  it("inactive is white with line border", () => {
    expect(chipClasses(false)).toContain("bg-white");
    expect(chipClasses(false)).toContain("border-brand-line");
  });
  it("always pill + nowrap", () => {
    expect(chipClasses(false)).toContain("rounded-full");
    expect(chipClasses(false)).toContain("whitespace-nowrap");
  });
});
