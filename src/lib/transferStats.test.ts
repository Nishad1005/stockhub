import { describe, it, expect } from "vitest";
import { transferStats } from "./transferStats";

// Fixed "now": 2026-06-15 12:00 local.
const NOW = new Date(2026, 5, 15, 12, 0, 0).getTime();
const at = (d: Date) => ({ created_at: d.toISOString() });

describe("transferStats", () => {
  it("counts today, last 7 days, and total", () => {
    const rows = [
      at(new Date(2026, 5, 15, 9, 0)), // today
      at(new Date(2026, 5, 15, 1, 0)), // today (earlier)
      at(new Date(2026, 5, 12, 9, 0)), // 3 days ago → in week, not today
      at(new Date(2026, 5, 1, 9, 0)), // 14 days ago → only total
    ];
    expect(transferStats(rows, NOW)).toEqual({ today: 2, week: 3, total: 4 });
  });

  it("is zero on an empty list", () => {
    expect(transferStats([], NOW)).toEqual({ today: 0, week: 0, total: 0 });
  });
});
