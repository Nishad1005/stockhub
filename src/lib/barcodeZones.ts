/** Distinct zones present in a set of entries, with counts, sorted by zone code. */
export function zonesPresent(
  entries: ReadonlyArray<{ zone_code: string }>,
): { zone: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const e of entries) counts.set(e.zone_code, (counts.get(e.zone_code) ?? 0) + 1);
  return [...counts.entries()]
    .map(([zone, count]) => ({ zone, count }))
    .sort((a, b) => a.zone.localeCompare(b.zone));
}
