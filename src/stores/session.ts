/**
 * Session store — v0.1's session-only override fields (reset on app reload).
 *
 * v0.1 kept these on `state` but excluded them from the persisted blob and reset
 * them in loadState():
 *   - manualEntryMode   (Settings → Manual Entry; global edit/scan unlock)
 *   - unlockedEntryIds  (per-entry manager unlocks)
 *
 * `editLockHours` is a persisted setting in v0.1; until the Settings screen +
 * its persistence land (Phase 8) it lives here with the default. These overrides
 * are deliberately NOT synced across devices (CLAUDE.md §11.4).
 */
import { create } from "zustand";
import { DEFAULT_EDIT_LOCK_HOURS } from "@/lib/editLock";

interface SessionState {
  manualEntryMode: boolean;
  unlockedEntryIds: string[];
  editLockHours: number;

  setManualEntryMode: (on: boolean) => void;
  unlockEntry: (id: string) => void;
  isUnlocked: (id: string) => boolean;
  setEditLockHours: (hours: number) => void;
  /** Mirrors v0.1 loadState() resetting session-only fields. */
  resetSessionOverrides: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  manualEntryMode: false,
  unlockedEntryIds: [],
  editLockHours: DEFAULT_EDIT_LOCK_HOURS,

  setManualEntryMode: (on) => set({ manualEntryMode: on }),
  unlockEntry: (id) =>
    set((s) =>
      s.unlockedEntryIds.includes(id)
        ? s
        : { unlockedEntryIds: [...s.unlockedEntryIds, id] },
    ),
  isUnlocked: (id) => get().unlockedEntryIds.includes(id),
  setEditLockHours: (hours) => set({ editLockHours: hours }),
  resetSessionOverrides: () => set({ manualEntryMode: false, unlockedEntryIds: [] }),
}));
