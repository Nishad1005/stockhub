import { useMemo, useState } from "react";
import { MasterSearch } from "@/components/MasterSearch";
import { CameraScanner } from "@/components/CameraScanner";
import { useEntries } from "@/hooks/useEntries";
import { useCreateTransfer } from "@/hooks/useCreateTransfer";
import { useSessionStore } from "@/stores/session";
import { findSourceEntry } from "@/lib/transferMatch";
import { validateShelf } from "@/lib/shelf-validator";
import { ZONE_INDEX } from "@/constants/zones";
import { toast } from "@/stores/toast";
import { errMessage } from "@/lib/errors";
import type { MasterItem } from "@/types/master";

export interface NewTransferModalProps {
  onClose: () => void;
}

type ScanTarget = "source" | "dest" | null;

/** Record a new transfer — ports v0.1 openTransferModal + saveTransfer. */
export function NewTransferModal({ onClose }: NewTransferModalProps) {
  const { data: entries = [] } = useEntries();
  const create = useCreateTransfer();
  const manualEntryMode = useSessionStore((s) => s.manualEntryMode);

  const [itemName, setItemName] = useState("");
  const [itemCode, setItemCode] = useState<string | null>(null);
  const [itemDefn, setItemDefn] = useState<string | null>(null);
  const [itemCategory, setItemCategory] = useState<string | null>(null);
  const [sourceShelf, setSourceShelf] = useState("");
  const [destShelf, setDestShelf] = useState("");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [storekeeper, setStorekeeper] = useState("");
  const [helper, setHelper] = useState("");
  const [scan, setScan] = useState<ScanTarget>(null);

  const sourceZone = validateShelf(sourceShelf).zoneCode;
  const destZone = validateShelf(destShelf).zoneCode;

  const sourceMatch = useMemo(
    () => findSourceEntry(entries, { shelfCode: sourceShelf, itemCode, itemName }),
    [entries, sourceShelf, itemCode, itemName],
  );

  function pick(it: MasterItem) {
    setItemName(it.name);
    setItemCode(it.code);
    setItemDefn(it.definition);
    setItemCategory(it.category);
  }
  function onItemNameChange(v: string) {
    setItemName(v);
    if (itemCode) setItemCode(null); // typing a fresh name clears a prior match
  }

  function onScanDetected(decoded: string) {
    const target = scan;
    setScan(null);
    const v = validateShelf(decoded);
    if (!v.ok || !v.code) {
      toast(`Not a location code: ${decoded}`, "warn");
      return;
    }
    if (target === "source") setSourceShelf(v.code);
    else if (target === "dest") setDestShelf(v.code);
  }

  async function save() {
    const qNum = parseInt(qty.trim(), 10);
    if (sourceMatch && sourceMatch.qty != null && Number.isFinite(qNum) && qNum > sourceMatch.qty) {
      if (!window.confirm(`Transferring ${qNum} but source only has ${sourceMatch.qty}. Proceed anyway?`)) return;
    }
    try {
      await create.mutateAsync({
        input: { itemName, itemCode, itemDefn, itemCategory, sourceShelf, destShelf, qty, reason, storekeeper, helper },
        sourceEntryId: sourceMatch?.id ?? null,
      });
      toast("Transfer saved", "ok");
      onClose();
    } catch (e) {
      toast("Transfer failed: " + errMessage(e), "warn");
    }
  }

  const field =
    "w-full rounded-lg border border-brand-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent read-only:bg-brand-cream";
  const shelfField = `${field} font-mono font-bold uppercase tracking-wide`;

  return (
    <div className="fixed inset-0 z-40 bg-black/60 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-2xl p-5 max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-brand-ink">New Transfer (STN)</h2>
          <button onClick={onClose} className="text-brand-mute text-lg leading-none px-1">✕</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-brand-mute mb-1">
              Item <span className="text-brand-bad">*</span>
            </label>
            <MasterSearch value={itemName} onChange={onItemNameChange} onPick={pick} />
            {itemCode && (
              <span className="inline-block mt-1.5 text-xs font-semibold rounded px-2 py-0.5 bg-brand-ok text-white">
                ✓ {itemCode}
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-brand-bad mb-1">From shelf *</label>
              <div className="flex gap-1">
                <input
                  value={sourceShelf}
                  readOnly={!manualEntryMode}
                  onChange={(e) => setSourceShelf(e.target.value.toUpperCase())}
                  placeholder={manualEntryMode ? "Z1-S047" : "Scan →"}
                  className={shelfField}
                />
                <button onClick={() => setScan("source")} className="rounded-lg bg-brand-accent-2 text-white px-3 text-sm">📷</button>
              </div>
              {sourceZone && <div className="text-[11px] text-brand-mute mt-0.5">{sourceZone} · {ZONE_INDEX[sourceZone]?.name}</div>}
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-brand-ok mb-1">To shelf *</label>
              <div className="flex gap-1">
                <input
                  value={destShelf}
                  readOnly={!manualEntryMode}
                  onChange={(e) => setDestShelf(e.target.value.toUpperCase())}
                  placeholder={manualEntryMode ? "Z2-S012" : "Scan →"}
                  className={shelfField}
                />
                <button onClick={() => setScan("dest")} className="rounded-lg bg-brand-accent-2 text-white px-3 text-sm">📷</button>
              </div>
              {destZone && <div className="text-[11px] text-brand-mute mt-0.5">{destZone} · {ZONE_INDEX[destZone]?.name}</div>}
            </div>
          </div>

          {sourceShelf && (itemCode || itemName.trim()) && (
            <div className={`text-xs rounded-lg p-2 ${sourceMatch ? "bg-brand-ok/10 text-brand-ok" : "bg-brand-warn/10 text-brand-warn"}`}>
              {sourceMatch
                ? `✓ Found at source — qty available: ${sourceMatch.qty ?? "—"}. Will deduct on save.`
                : "⚠ No matching entry at source — will log as audit only."}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-brand-mute mb-1">
              Quantity <span className="text-brand-bad">*</span>
            </label>
            <input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="—" className={field} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-brand-mute mb-1">Reason</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Reallocation for production" className={field} />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-brand-mute mb-1">Storekeeper</label>
              <input value={storekeeper} onChange={(e) => setStorekeeper(e.target.value)} className={field} />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-brand-mute mb-1">Helper</label>
              <input value={helper} onChange={(e) => setHelper(e.target.value)} className={field} />
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 rounded-lg border border-brand-line py-2 text-sm font-semibold">Cancel</button>
          <button onClick={save} disabled={create.isPending} className="flex-1 rounded-lg bg-brand-accent-2 text-white py-2 text-sm font-semibold disabled:opacity-60">
            {create.isPending ? "Saving…" : "Save transfer"}
          </button>
        </div>
      </div>

      <CameraScanner
        open={scan !== null}
        title={scan === "source" ? "Scan SOURCE shelf" : "Scan DESTINATION shelf"}
        onClose={() => setScan(null)}
        onDetected={onScanDetected}
      />
    </div>
  );
}
