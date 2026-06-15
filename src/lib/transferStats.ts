/** Header counts for the Transfers screen — ports v0.1 renderTransfersScreen stats. */
export interface TransferStats {
  today: number;
  week: number;
  total: number;
}

/**
 * Bucket transfers by capture time. `week` is the last 7 days (matches v0.1:
 * `new Date(y, m, d - 7)`). `nowMs` is injectable so tests are deterministic.
 */
export function transferStats(
  rows: ReadonlyArray<{ created_at: string }>,
  nowMs: number = Date.now(),
): TransferStats {
  const now = new Date(nowMs);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).getTime();
  let today = 0;
  let week = 0;
  for (const r of rows) {
    const ts = new Date(r.created_at).getTime();
    if (ts >= todayStart) today++;
    if (ts >= weekStart) week++;
  }
  return { today, week, total: rows.length };
}
