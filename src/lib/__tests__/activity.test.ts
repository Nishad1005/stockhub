import { describe, it, expect, vi, beforeEach } from "vitest";

const { from, insert } = vi.hoisted(() => {
  const insert = vi.fn();
  const from = vi.fn(() => ({ insert }));
  return { from, insert };
});

vi.mock("@/lib/supabase", () => ({ supabase: { from } }));
vi.mock("@/stores/auth", () => ({
  useAuthStore: {
    getState: () => ({ user: { id: "user-1", user_metadata: { role: "manager" } } }),
  },
}));

import { logActivity } from "@/lib/activity";
import { CURRENT_TENANT_ID } from "@/constants/tenant";

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  from.mockClear();
  insert.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("logActivity", () => {
  it("inserts an activity_log row with the right shape", async () => {
    insert.mockReturnValue(Promise.resolve({ error: null }));

    logActivity({
      action: "grn.gate_entry.created",
      entityType: "grn",
      entityId: "g1",
      notes: "n",
    });
    await flush();

    expect(from).toHaveBeenCalledWith("activity_log");
    expect(insert).toHaveBeenCalledTimes(1);
    const row = insert.mock.calls[0][0];
    expect(row).toMatchObject({
      tenant_id: CURRENT_TENANT_ID,
      actor_id: "user-1",
      actor_role: "manager",
      action: "grn.gate_entry.created",
      entity_type: "grn",
      entity_id: "g1",
      ip_address: null,
      notes: "n",
    });
    // user_agent is captured (string in a DOM env, null in node) — the key must exist.
    expect(row).toHaveProperty("user_agent");
  });

  it("defaults optional fields to null", async () => {
    insert.mockReturnValue(Promise.resolve({ error: null }));

    logActivity({ action: "x", entityType: "y" });
    await flush();

    const row = insert.mock.calls[0][0];
    expect(row).toMatchObject({
      entity_id: null,
      before: null,
      after: null,
      notes: null,
      ip_address: null,
    });
  });

  it("does NOT throw when supabase rejects", async () => {
    insert.mockReturnValue(Promise.reject(new Error("network")));

    expect(() => logActivity({ action: "x", entityType: "y" })).not.toThrow();
    await flush(); // rejection is swallowed inside logActivity — no unhandled rejection
    expect(insert).toHaveBeenCalledTimes(1);
  });
});
