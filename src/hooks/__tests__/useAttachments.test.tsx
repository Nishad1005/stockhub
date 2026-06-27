import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * The project has no @testing-library/react or jsdom test environment (every existing
 * test is a pure-function unit test in the node env), so we cannot literally render the
 * hook. Instead we verify "the query is built correctly" by exercising the exported
 * query-key factory and the queryFn that the hook runs — the same idiom as `useEntries`
 * (which exports `entriesKeys`). The supabase client is mocked as a chainable builder.
 */
const { from, builder, rows } = vi.hoisted(() => {
  const rows = [{ id: "a1", entity_type: "grn", entity_id: "g1" }];
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.order.mockReturnValue(Promise.resolve({ data: rows, error: null }));
  const from = vi.fn(() => builder);
  return { from, builder, rows };
});

vi.mock("@/lib/supabase", () => ({ supabase: { from } }));

import { attachmentsKeys, fetchAttachments } from "@/hooks/useAttachments";

beforeEach(() => {
  from.mockClear();
  builder.select.mockClear();
  builder.eq.mockClear();
  builder.order.mockClear();
});

describe("attachmentsKeys.list", () => {
  it("builds a stable key from entityType + entityId", () => {
    expect(attachmentsKeys.list("grn", "g1")).toEqual(["attachments", "grn", "g1"]);
  });

  it("includes null entityId (the hook disables the query in that case)", () => {
    expect(attachmentsKeys.list("grn", null)).toEqual(["attachments", "grn", null]);
  });
});

describe("fetchAttachments", () => {
  it("queries `attachments` filtered by entity_type and entity_id, newest first", async () => {
    const result = await fetchAttachments("grn", "g1");

    expect(from).toHaveBeenCalledWith("attachments");
    expect(builder.select).toHaveBeenCalledWith("*");
    expect(builder.eq).toHaveBeenNthCalledWith(1, "entity_type", "grn");
    expect(builder.eq).toHaveBeenNthCalledWith(2, "entity_id", "g1");
    expect(builder.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(result).toEqual(rows);
  });

  it("throws when supabase returns an error", async () => {
    builder.order.mockReturnValueOnce(
      Promise.resolve({ data: null, error: { message: "boom" } }),
    );
    await expect(fetchAttachments("grn", "g1")).rejects.toBeTruthy();
  });
});
