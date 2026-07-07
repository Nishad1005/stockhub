import { describe, it, expect } from "vitest";
import {
  formatWaitingTime,
  waitingTone,
  minutesSince,
  computeVarianceFlag,
  nextLineNumber,
} from "./grn";

describe("formatWaitingTime", () => {
  it("shows minutes up to 90", () => {
    expect(formatWaitingTime(0)).toBe("0 min");
    expect(formatWaitingTime(47)).toBe("47 min");
    expect(formatWaitingTime(90)).toBe("90 min");
  });
  it("shows Xh Ym past 90 minutes", () => {
    expect(formatWaitingTime(91)).toBe("1h 31m");
    expect(formatWaitingTime(120)).toBe("2h 0m");
    expect(formatWaitingTime(135)).toBe("2h 15m");
  });
  it("floors and clamps negatives", () => {
    expect(formatWaitingTime(12.9)).toBe("12 min");
    expect(formatWaitingTime(-5)).toBe("0 min");
  });
});

describe("waitingTone", () => {
  it("neutral under 30 minutes", () => {
    expect(waitingTone(0)).toBe("neutral");
    expect(waitingTone(29)).toBe("neutral");
  });
  it("warn from 30 to 60 minutes", () => {
    expect(waitingTone(30)).toBe("warn");
    expect(waitingTone(60)).toBe("warn");
  });
  it("bad over 60 minutes", () => {
    expect(waitingTone(61)).toBe("bad");
    expect(waitingTone(200)).toBe("bad");
  });
});

describe("minutesSince", () => {
  const now = new Date("2026-07-02T10:00:00Z").getTime();
  it("computes whole minutes elapsed", () => {
    expect(minutesSince("2026-07-02T09:13:00Z", now)).toBe(47);
    expect(minutesSince("2026-07-02T10:00:00Z", now)).toBe(0);
  });
  it("clamps future timestamps and invalid input to 0", () => {
    expect(minutesSince("2026-07-02T10:30:00Z", now)).toBe(0);
    expect(minutesSince("not-a-date", now)).toBe(0);
  });
});

describe("computeVarianceFlag", () => {
  it("is false until a received qty is entered", () => {
    expect(computeVarianceFlag(null, 10)).toBe(false);
    expect(computeVarianceFlag(undefined, 10)).toBe(false);
  });
  it("is false when received matches invoice", () => {
    expect(computeVarianceFlag(10, 10)).toBe(false);
    expect(computeVarianceFlag(0, 0)).toBe(false);
  });
  it("is true when received differs from invoice", () => {
    expect(computeVarianceFlag(8, 10)).toBe(true);
    expect(computeVarianceFlag(12, 10)).toBe(true);
  });
  it("is true when received is entered against no invoice qty", () => {
    expect(computeVarianceFlag(5, null)).toBe(true);
    expect(computeVarianceFlag(5, undefined)).toBe(true);
  });
});

describe("nextLineNumber", () => {
  it("starts at 1 for an empty GRN", () => {
    expect(nextLineNumber([])).toBe(1);
  });
  it("returns max + 1 (monotonic, never fills gaps)", () => {
    expect(nextLineNumber([1, 2, 3])).toBe(4);
    expect(nextLineNumber([2])).toBe(3);
    expect(nextLineNumber([1, 3])).toBe(4);
    expect(nextLineNumber([3, 1, 2])).toBe(4);
  });
});
