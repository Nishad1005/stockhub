import { describe, it, expect } from "vitest";
import { isEntryLocked, entryAgeHours, DEFAULT_EDIT_LOCK_HOURS } from "./editLock";

const HOUR = 3_600_000;
const NOW = 1_700_000_000_000;
const at = (hoursAgo: number) => new Date(NOW - hoursAgo * HOUR).toISOString();

describe("isEntryLocked (v0.1 parity)", () => {
  it("is unlocked within the window, locked at/after it", () => {
    expect(isEntryLocked({ id: "1", created_at: at(23) }, { now: NOW })).toBe(false);
    expect(isEntryLocked({ id: "1", created_at: at(24) }, { now: NOW })).toBe(true); // >= boundary
    expect(isEntryLocked({ id: "1", created_at: at(48) }, { now: NOW })).toBe(true);
  });

  it("respects a custom lock window", () => {
    expect(isEntryLocked({ id: "1", created_at: at(2) }, { editLockHours: 1, now: NOW })).toBe(true);
    expect(isEntryLocked({ id: "1", created_at: at(2) }, { editLockHours: 6, now: NOW })).toBe(false);
  });

  it("manualEntryMode unlocks everything", () => {
    expect(isEntryLocked({ id: "1", created_at: at(100) }, { manualEntryMode: true, now: NOW })).toBe(false);
  });

  it("per-entry unlock overrides the window", () => {
    const old = { id: "abc", created_at: at(100) };
    expect(isEntryLocked(old, { now: NOW })).toBe(true);
    expect(isEntryLocked(old, { unlockedEntryIds: ["abc"], now: NOW })).toBe(false);
    expect(isEntryLocked(old, { unlockedEntryIds: ["other"], now: NOW })).toBe(true);
  });

  it("never locks an entry without a created_at", () => {
    expect(isEntryLocked({ id: "1", created_at: null }, { now: NOW })).toBe(false);
    expect(isEntryLocked({ id: "1" }, { now: NOW })).toBe(false);
  });

  it("defaults to a 24h window", () => {
    expect(DEFAULT_EDIT_LOCK_HOURS).toBe(24);
    expect(entryAgeHours(at(24), NOW)).toBeCloseTo(24, 5);
    expect(entryAgeHours(null, NOW)).toBe(0);
  });
});
