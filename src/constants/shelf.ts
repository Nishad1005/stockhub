/**
 * Shelf-code regex and fixture-type definitions.
 *
 * Ported from v0.1: `legacy/UM_Designs_StockHub.html` (search SHELF_RE).
 *
 * DO NOT change without updating CLAUDE.md §5.1 and notifying the team.
 * The 612 already-printed physical labels (Z01–Z06) assume this format.
 */

export const SHELF_RE = /^Z(\d+)-([SGPR])(\d+)$/i;

export type FixtureType = "S" | "G" | "P" | "R";

export const FIXTURE_NAMES: Record<FixtureType, string> = {
  S: "Shelf",
  G: "Ghoda Fixture",
  P: "Pallet",
  R: "Rack",
};

export const FIXTURE_HEADERS: Record<FixtureType, string> = {
  S: "SHELF LOCATION",
  G: "GHODA FIXTURE",
  P: "PALLET LOCATION",
  R: "RACK LOCATION",
};

/** Single-letter counter word used on physical labels ("Shelf 5 of 116"). */
export const FIXTURE_COUNTER_WORDS: Record<FixtureType, string> = {
  S: "Shelf",
  G: "Ghoda",
  P: "Pallet",
  R: "Rack",
};

/** USB/Bluetooth scanner detection — keystrokes faster than this are scanner-typed. */
export const USB_KEYSTROKE_GAP_MS = 80;
