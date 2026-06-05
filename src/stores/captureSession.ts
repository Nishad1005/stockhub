/**
 * Capture session — the active location while capturing (v0.1 activeZone /
 * activeShelf / activeFixtureType). Sticky across saves; cleared only when the
 * operator taps ✕. In-memory for now (v0.1 persisted these to localStorage;
 * persistence across reloads is a small follow-up).
 *
 * manualEntryMode lives in stores/session.ts (shared with edit-lock).
 */
import { create } from "zustand";
import type { FixtureType } from "@/constants/shelf";
import { validateShelf } from "@/lib/shelf-validator";

export type ScanMode = "item" | "shelf";

export interface ShelfApplyResult {
  ok: boolean;
  code?: string;
  fixtureType?: FixtureType;
  zoneCode?: string;
  zoneChanged: boolean;
}

interface CaptureSessionState {
  activeZone: string | null;
  activeShelf: string | null;
  activeFixtureType: FixtureType | null;
  scanMode: ScanMode;
  scanTargetFieldId: string | null;

  /** Validate + apply a shelf code, auto-deriving the zone (v0.1 §5.2). */
  applyShelf: (raw: string) => ShelfApplyResult;
  setZone: (code: string) => void;
  clearShelf: () => void;
  setScanMode: (m: ScanMode) => void;
}

export const useCaptureSession = create<CaptureSessionState>((set, get) => ({
  activeZone: null,
  activeShelf: null,
  activeFixtureType: null,
  scanMode: "item",
  scanTargetFieldId: null,

  applyShelf: (raw) => {
    const v = validateShelf(raw);
    if (!v.ok || !v.code || !v.fixtureType) return { ok: false, zoneChanged: false };
    const prevZone = get().activeZone;
    const zoneChanged = !!v.zoneCode && v.zoneCode !== prevZone;
    set({
      activeShelf: v.code,
      activeFixtureType: v.fixtureType,
      activeZone: v.zoneCode ?? prevZone,
    });
    return { ok: true, code: v.code, fixtureType: v.fixtureType, zoneCode: v.zoneCode, zoneChanged };
  },
  setZone: (code) => set({ activeZone: code }),
  clearShelf: () => set({ activeShelf: null, activeFixtureType: null }),
  setScanMode: (m) => set({ scanMode: m }),
}));
