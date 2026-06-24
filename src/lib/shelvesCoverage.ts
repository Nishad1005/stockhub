export interface ZoneCoverage {
  zoneCode: string;
  count: number;
}

export interface ShelvesCoverage {
  zones: ZoneCoverage[];
  total: number;
}

/** Count registered shelves per zone, sorted by zone code ascending. */
export function shelvesCoverage(
  rows: ReadonlyArray<{ zone_code: string }>,
): ShelvesCoverage {
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.zone_code, (counts.get(r.zone_code) ?? 0) + 1);
  const zones = [...counts.entries()]
    .map(([zoneCode, count]) => ({ zoneCode, count }))
    .sort((a, b) => a.zoneCode.localeCompare(b.zoneCode));
  return { zones, total: rows.length };
}
