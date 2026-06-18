import { describe, it, expect } from "vitest";
import { loginSchema, signupSchema } from "./auth";

const signupBase = { fullName: "Asha", email: "a@b.com", password: "secret1" };

describe("signupSchema", () => {
  it("accepts a valid signup", () => {
    expect(signupSchema.parse(signupBase)).toMatchObject({ fullName: "Asha", email: "a@b.com" });
  });
  it("rejects a missing name", () => {
    expect(() => signupSchema.parse({ ...signupBase, fullName: "  " })).toThrow();
  });
  it("rejects a bad email", () => {
    expect(() => signupSchema.parse({ ...signupBase, email: "nope" })).toThrow();
  });
  it("rejects a short password", () => {
    expect(() => signupSchema.parse({ ...signupBase, password: "12345" })).toThrow();
  });
});

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
