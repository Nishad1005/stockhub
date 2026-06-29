import { describe, it, expect } from "vitest";
import { formatWaitingTime, waitingTone } from "./grn";

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
