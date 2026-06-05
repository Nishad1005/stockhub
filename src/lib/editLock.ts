/**
 * Edit-lock — exact port of v0.1 `isEntryLocked()` (legacy HTML ~line 1232).
 *
 * The lock is a CLIENT-SIDE UX gate, never enforced in the DB: the manager
 * override is per-device and must not sync (CLAUDE.md §5.3 / §11.4). The lock
 * window derives from `created_at`, NOT last-edited time — editing never extends
 * the window (CLAUDE.md §11.6).
 */

/** Configurable lock windows (hours), per CLAUDE.md §5.3. */
export const EDIT_LOCK_OPTIONS_HOURS = [1, 6, 12, 24, 48, 168] as const;
export const DEFAULT_EDIT_LOCK_HOURS = 24;

export interface EditLockContext {
  /** Lock window in hours (default 24). */
  editLockHours?: number;
  /** Manager "manual entry" mode — global per-session unlock. */
  manualEntryMode?: boolean;
  /** Entry ids the manager unlocked individually this session. */
  unlockedEntryIds?: readonly string[];
  /** Override "now" for testing. */
  now?: number;
}

/** Minimal entry shape the lock cares about. */
export interface LockableEntry {
  id: string;
  created_at?: string | null;
}

const MS_PER_HOUR = 3_600_000;

export function entryAgeHours(createdAt: string | null | undefined, now = Date.now()): number {
  if (!createdAt) return 0;
  return (now - new Date(createdAt).getTime()) / MS_PER_HOUR;
}

export function isEntryLocked(entry: LockableEntry | null | undefined, ctx: EditLockContext = {}): boolean {
  const {
    editLockHours = DEFAULT_EDIT_LOCK_HOURS,
    manualEntryMode = false,
    unlockedEntryIds = [],
    now = Date.now(),
  } = ctx;

  if (!entry || !entry.created_at) return false; // v0.1: no ts → never locked
  if (manualEntryMode) return false; // global override
  if (unlockedEntryIds.includes(entry.id)) return false; // per-entry override
  return entryAgeHours(entry.created_at, now) >= editLockHours;
}
