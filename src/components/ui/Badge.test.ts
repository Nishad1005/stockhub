import { describe, it, expect } from "vitest";
import { badgeClasses } from "./Badge";

describe("badgeClasses", () => {
  it("maps each tone to its token tint", () => {
    expect(badgeClasses("ok")).toContain("text-brand-ok");
    expect(badgeClasses("ok")).toContain("bg-brand-ok/15");
    expect(badgeClasses("warn")).toContain("text-brand-warn");
    expect(badgeClasses("bad")).toContain("text-brand-bad");
    expect(badgeClasses("neutral")).toContain("text-brand-mute");
  });
  it("is always a pill", () => {
    expect(badgeClasses("ok")).toContain("rounded-full");
  });
});
