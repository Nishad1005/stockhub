import { useEffect, useState, type KeyboardEvent } from "react";
import { ZONES, ZONE_INDEX } from "@/constants/zones";
import { FIXTURE_NAMES } from "@/constants/shelf";
import { useCaptureSession } from "@/stores/captureSession";
import { useSessionStore } from "@/stores/session";
import { useShelfChecker } from "@/hooks/useShelves";

export interface ShelfCardProps {
  /** Open the camera scanner (shelf mode). */
  onScanClick: () => void;
  /** Apply a typed/edited shelf code (manual mode), with toasts handled upstream. */
  onApplyShelf: (raw: string) => void;
}

/** Zone display + shelf input + scan button + sticky status (v0.1 renderShelfState). */
export function ShelfCard({ onScanClick, onApplyShelf }: ShelfCardProps) {
  const { activeZone, activeShelf, activeFixtureType, setZone, clearShelf } = useCaptureSession();
  const manualEntryMode = useSessionStore((s) => s.manualEntryMode);
  const [draft, setDraft] = useState(activeShelf ?? "");
  const checkShelf = useShelfChecker();

  // Keep the editable draft in sync when the shelf changes from a scan.
  useEffect(() => {
    setDraft(activeShelf ?? "");
  }, [activeShelf]);

  const zone = activeZone ? ZONE_INDEX[activeZone] : null;

  function commitDraft() {
    if (manualEntryMode && draft.trim()) onApplyShelf(draft);
  }
  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitDraft();
    }
  }

  return (
    <div className="bg-white rounded-xl border border-brand-line p-4 mb-4">
      {/* Zone */}
      <div className="mb-3">
        <div className="text-xs font-semibold text-brand-mute mb-1">Zone</div>
        {manualEntryMode ? (
          <select
            value={activeZone ?? ""}
            onChange={(e) => setZone(e.target.value)}
            className="w-full rounded-lg border border-brand-line px-3 py-2 text-sm"
          >
            <option value="">— choose zone —</option>
            {ZONES.map((z) => (
              <option key={z.code} value={z.code}>
                {z.label}
              </option>
            ))}
          </select>
        ) : zone ? (
          <div className="rounded-lg bg-brand-accent-soft px-3 py-2">
            <div className="font-mono font-bold text-brand-ink">{zone.code}</div>
            <div className="text-sm text-brand-ink">{zone.name}</div>
            <div className="text-xs text-brand-mute">{zone.purpose}</div>
          </div>
        ) : (
          <div className="rounded-lg bg-brand-accent-soft px-3 py-2 text-sm text-brand-mute">
            Scan a shelf — the zone is set automatically.
          </div>
        )}
      </div>

      {/* Shelf */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-brand-mute">
            Shelf / Fixture <span className="text-brand-bad">*</span>
          </span>
          {activeShelf && (
            <button
              type="button"
              onClick={clearShelf}
              className="text-xs text-brand-bad font-semibold"
            >
              ✕ Clear
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            readOnly={!manualEntryMode}
            onChange={(e) => setDraft(e.target.value.toUpperCase())}
            onKeyDown={onKeyDown}
            onBlur={commitDraft}
            placeholder={manualEntryMode ? "Z1-S042" : "Tap Scan →"}
            spellCheck={false}
            autoCapitalize="characters"
            className="flex-1 rounded-lg border border-brand-line px-3 py-2 text-sm font-mono font-bold uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-brand-accent read-only:bg-brand-cream"
          />
          {manualEntryMode ? (
            <button
              type="button"
              onClick={commitDraft}
              disabled={!draft.trim()}
              className="rounded-lg bg-brand-accent-2 text-white font-semibold px-4 text-sm disabled:opacity-50"
            >
              ✓ Set
            </button>
          ) : (
            <button
              type="button"
              onClick={onScanClick}
              className="rounded-lg bg-brand-accent-2 text-white font-semibold px-4 text-sm"
            >
              📷 Scan
            </button>
          )}
        </div>

        <div className="mt-2 text-xs">
          {activeShelf ? (
            <span className="text-brand-ok font-medium">
              ✓ {activeFixtureType ? FIXTURE_NAMES[activeFixtureType] : "Location"}{" "}
              <span className="font-mono">{activeShelf}</span> set — sticky for next entries
            </span>
          ) : manualEntryMode ? (
            <span className="text-brand-mute">
              ⚠️ Manager mode — type a code like <span className="font-mono">Z1-S042</span> or scan.
            </span>
          ) : (
            <span className="text-brand-mute">
              📷 Scan required — tap Scan or use a USB scanner (e.g.{" "}
              <span className="font-mono">Z3-S042</span>).
            </span>
          )}
        </div>

        {activeShelf && checkShelf(activeShelf) === false && (
          <div className="mt-1 text-xs text-brand-warn">⚠ Not a registered shelf</div>
        )}
      </div>
    </div>
  );
}
