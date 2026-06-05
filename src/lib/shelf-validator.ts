/**
 * Shelf code validator — port of v0.1 validateShelf().
 * Single source of truth: `src/constants/shelf.ts`.
 */
import { SHELF_RE, type FixtureType } from "@/constants/shelf";
import { ZONE_INDEX } from "@/constants/zones";

export interface ShelfValidationResult {
  ok: boolean;
  code?: string;            // normalized as-scanned: uppercase, whitespace-stripped, NOT padded
  zoneCode?: string;        // e.g. "Z03"
  zoneDigit?: string;       // e.g. "3"
  fixtureType?: FixtureType;
  sequence?: number;
}

export function validateShelf(raw: string | null | undefined): ShelfValidationResult {
  if (!raw) return { ok: false };
  // Normalize exactly as v0.1 does, then match — v0.1 stores the code as-scanned.
  const code = normaliseShelf(raw);
  const m = SHELF_RE.exec(code);
  if (!m) return { ok: false, code };

  const zoneDigit = m[1];
  const fixtureType = m[2].toUpperCase() as FixtureType;
  const seq = parseInt(m[3], 10);
  return { ok: true, code, zoneDigit, fixtureType, sequence: seq, zoneCode: deriveZoneCode(zoneDigit) };
}

export function deriveZoneCode(zoneDigit: string): string | undefined {
  const n = parseInt(zoneDigit, 10);
  if (!Number.isFinite(n)) return undefined;
  const code = `Z${String(n).padStart(2, "0")}`;
  return ZONE_INDEX[code] ? code : undefined;
}

export function normaliseShelf(input: string): string {
  // v0.1 parity: uppercase, trim, and strip ALL internal whitespace
  // (so "Z3 S5" / "z3-s 5" normalize to "Z3-S5").
  return String(input || "").trim().toUpperCase().replace(/\s+/g, "");
}
