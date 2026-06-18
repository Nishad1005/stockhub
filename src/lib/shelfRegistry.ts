/** Uppercased set of known shelf codes (for O(1) "is this a real shelf?" checks). */
export function buildShelfCodeSet(rows: ReadonlyArray<{ code: string }>): Set<string> {
  return new Set(rows.map((r) => r.code.trim().toUpperCase()));
}

/** True if `code` (trimmed, uppercased) is a registered shelf. Empty → false. */
export function isKnownShelf(set: Set<string>, code: string): boolean {
  const c = (code || "").trim().toUpperCase();
  return c.length > 0 && set.has(c);
}
