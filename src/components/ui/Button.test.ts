import { describe, it, expect } from "vitest";
import { buttonClasses } from "./Button";

describe("buttonClasses", () => {
  it("primary md uses accent-2 fill + btn shadow", () => {
    const c = buttonClasses("primary", "md");
    expect(c).toContain("bg-brand-accent-2");
    expect(c).toContain("text-white");
    expect(c).toContain("shadow-btn");
    expect(c).toContain("px-4");
  });
  it("secondary uses white + line border, no fill", () => {
    const c = buttonClasses("secondary", "md");
    expect(c).toContain("bg-white");
    expect(c).toContain("border-brand-line");
    expect(c).not.toContain("bg-brand-accent-2");
  });
  it("danger uses bad text, ghost is transparent", () => {
    expect(buttonClasses("danger", "md")).toContain("text-brand-bad");
    expect(buttonClasses("ghost", "md")).toContain("bg-transparent");
  });
  it("sm is more compact than md", () => {
    expect(buttonClasses("primary", "sm")).toContain("px-3");
    expect(buttonClasses("primary", "sm")).toContain("text-xs");
  });
  it("fullWidth adds w-full", () => {
    expect(buttonClasses("primary", "md", true)).toContain("w-full");
  });
});
