/** Pure helpers for GRN wait-time display (Open GRNs tile / screen). */

export type WaitingTone = "neutral" | "warn" | "bad";

/** Badge tone by wait time: <30 neutral, 30–60 warn, >60 bad. */
export function waitingTone(minutes: number): WaitingTone {
  if (minutes > 60) return "bad";
  if (minutes >= 30) return "warn";
  return "neutral";
}

/** "47 min" up to 90 minutes; "2h 15m" beyond that. */
export function formatWaitingTime(minutes: number): string {
  const m = Math.max(0, Math.floor(minutes));
  if (m <= 90) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return `${h}h ${rem}m`;
}

/** Whole minutes elapsed since an ISO timestamp, clamped at 0. Invalid → 0. */
export function minutesSince(iso: string, nowMs: number = Date.now()): number {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((nowMs - then) / 60000));
}
