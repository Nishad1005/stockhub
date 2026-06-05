import { describe, it, expect } from "vitest";
import { loginSchema } from "./auth";

describe("loginSchema", () => {
  it("accepts a valid email + password (trimming email)", () => {
    const r = loginSchema.parse({ email: "  user@um.com ", password: "secret" });
    expect(r).toEqual({ email: "user@um.com", password: "secret" });
  });

  it("rejects a bad email", () => {
    expect(loginSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
  });

  it("rejects an empty password", () => {
    expect(loginSchema.safeParse({ email: "user@um.com", password: "" }).success).toBe(false);
  });
});
