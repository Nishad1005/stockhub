import { describe, it, expect } from "vitest";
import { buildPermMap, resolveCan } from "./permissions";

const rows = [
  { role: "storekeeper" as const, permission: "capture" },
  { role: "storekeeper" as const, permission: "transfer" },
  { role: "manager" as const, permission: "unlock_entry" },
];

describe("buildPermMap", () => {
  it("groups granted permissions by role", () => {
    const m = buildPermMap(rows);
    expect([...(m.get("storekeeper") ?? [])].sort()).toEqual(["capture", "transfer"]);
    expect(m.get("manager")?.has("unlock_entry")).toBe(true);
  });
});

describe("resolveCan", () => {
  const m = buildPermMap(rows);
  it("admin can do anything", () => {
    expect(resolveCan(m, "admin", "delete_entry")).toBe(true);
  });
  it("null / pending can do nothing", () => {
    expect(resolveCan(m, null, "capture")).toBe(false);
    expect(resolveCan(m, "pending", "capture")).toBe(false);
  });
  it("non-admin follows the map", () => {
    expect(resolveCan(m, "storekeeper", "capture")).toBe(true);
    expect(resolveCan(m, "storekeeper", "unlock_entry")).toBe(false);
  });
});
