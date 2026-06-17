import { useMemo, useState } from "react";
import { MasterSearch } from "@/components/MasterSearch";
import { CameraScanner } from "@/components/CameraScanner";
import { useEntries } from "@/hooks/useEntries";
import { useCreateMovement } from "@/hooks/useCreateMovement";
import { useSessionStore } from "@/stores/session";
import { findSourceEntry } from "@/lib/transferMatch";
import { validateShelf } from "@/lib/shelf-validator";
import { ZONE_INDEX } from "@/constants/zones";
import { toast } from "@/stores/toast";
import { errMessage } from "@/lib/errors";
import type { MasterItem } from "@/types/master";

export interface MovementModalProps {
  type: "IN" | "OUT";
  onClose: () => void;
  initialItem?: { name: string; code: string | null; defn: string | null; category: string | null };
  initialShelf?: string;
}

export function MovementModal({ type, onClose, initialItem, initialShelf }: MovementModalProps) {
  const { data: entries = [] } = useEntries();
  const create = useCreateMovement();
  const manualEntryMode = useSessionStore((s) => s.manualEntryMode);

  const [itemName, setItemName] = useState(initialItem?.name ?? "");
  const [itemCode, setItemCode] = useState<string | null>(initialItem?.code ?? null);
  const [itemDefn, setItemDefn] = useState<string | null>(initialItem?.defn ?? null);
  const [itemCategory, setItemCategory] = useState<string | null>(initialItem?.category ?? null);
  const [shelfCode, setShelfCode] = useState(initialShelf ?? "");
  const [qty, setQty] = useState("");
  const [sourceOrDest, setSourceOrDest] = useState("");
  const [reason, setReason] = useState("");
  const [authorizedBy, setAuthorizedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [scanOpen, setScanOpen] = useState(false);

  const isIn = type === "IN";
  const zone = validateShelf(shelfCode).zoneCode;
  const match = useMemo(
    () => findSourceEntry(entries, { shelfCode, itemCode, itemName }),
    [entries, shelfCode, itemCode, itemName],
  );
  const available = match?.qty ?? 0;

  function pick(it: MasterItem) {
    setItemName(it.name);
    setItemCode(it.code);
    setItemDefn(it.definition);
    setItemCategory(it.category);
  }
  function onNameChange(v: string) {
    setItemName(v);
    if (itemCode) setItemCode(null);
  }
  function onScan(decoded: string) {
    setScanOpen(false);
    const sv = validateShelf(decoded);
    if (!sv.ok || !sv.code) {
      toast(`Not a location code: ${decoded}`, "warn");
      return;
    }
    setShelfCode(sv.code);
  }

  async function save() {
    const qNum = parseInt(qty.trim(), 10);
    if (!isIn && Number.isFinite(qNum) && qNum > available) {
      if (!window.confirm(`System shows ${available} at ${shelfCode || "this shelf"}, issuing ${qNum}. Proceed?`)) return;
    }
    try {
      await create.mutateAsync({
        input: { type, itemName, itemCode, itemDefn, itemCategory, shelfCode, qty, sourceOrDest, reason, authorizedBy, notes },
        matchedEntryId: match?.id ?? null,
        availableQty: isIn ? null : available,
      });
      toast(isIn ? "Stock received" : "Stock issued", "ok");
      onClose();
    } catch (e) {
      toast("Failed: " + errMessage(e), "warn");
    }
  }

  const field =
    "w-full rounded-lg border border-brand-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent read-only:bg-brand-cream";

  return (
    <div className="fixed inset-0 z-40 bg-black/60 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-2xl p-5 max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-brand-ink">{isIn ? "📥 Stock IN (GRN)" : "📤 Stock OUT (MIR)"}</h2>
          <button onClick={onClose} className="text-brand-mute text-lg leading-none px-1">✕</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-brand-mute mb-1">Item <span className="text-brand-bad">*</span></label>
            <MasterSearch value={itemName} onChange={onNameChange} onPick={pick} />
            {itemCode && <span className="inline-block mt-1.5 text-xs font-semibold rounded px-2 py-0.5 bg-brand-ok text-white">✓ {itemCode}</span>}
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1 ${isIn ? "text-brand-ok" : "text-brand-bad"}`}>
              {isIn ? "To shelf" : "From shelf"} <span className="text-brand-bad">*</span>
            </label>
            <div className="flex gap-1">
              <input
                value={shelfCode}
                readOnly={!manualEntryMode}
                onChange={(e) => setShelfCode(e.target.value.toUpperCase())}
                placeholder={manualEntryMode ? "Z3-S042" : "Scan →"}
                className={`${field} font-mono font-bold uppercase tracking-wide`}
              />
              <button onClick={() => setScanOpen(true)} className="rounded-lg bg-brand-accent-2 text-white px-3 text-sm">📷</button>
            </div>
            {zone && <div className="text-[11px] text-brand-mute mt-0.5">{zone} · {ZONE_INDEX[zone]?.name}</div>}
          </div>

          {shelfCode && (itemCode || itemName.trim()) && (
            <div className={`text-xs rounded-lg p-2 ${match ? "bg-brand-ok/10 text-brand-ok" : "bg-brand-warn/10 text-brand-warn"}`}>
              {match
                ? `On hand here: ${available}. ${isIn ? "Will add to it." : "Will deduct on save."}`
                : isIn
                  ? "Not here yet — a new entry will be created at this shelf."
                  : "⚠ No stock of this item recorded here — will log as audit only."}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-brand-mute mb-1">Quantity <span className="text-brand-bad">*</span></label>
            <input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="—" className={field} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-brand-mute mb-1">
              {isIn ? "Supplier / source" : "Department / destination"} <span className="text-brand-bad">*</span>
            </label>
            <input value={sourceOrDest} onChange={(e) => setSourceOrDest(e.target.value)} placeholder={isIn ? "e.g. Acme Supplies / Production" : "e.g. Stitching / Dispatch / Scrap"} className={field} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-brand-mute mb-1">Reason</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} className={field} />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-brand-mute mb-1">Authorized by</label>
              <input value={authorizedBy} onChange={(e) => setAuthorizedBy(e.target.value)} className={field} />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-brand-mute mb-1">Notes</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} className={field} />
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 rounded-lg border border-brand-line py-2 text-sm font-semibold">Cancel</button>
          <button onClick={save} disabled={create.isPending} className="flex-1 rounded-lg bg-brand-accent-2 text-white py-2 text-sm font-semibold disabled:opacity-60">
            {create.isPending ? "Saving…" : isIn ? "Receive stock" : "Issue stock"}
          </button>
        </div>
      </div>

      <CameraScanner open={scanOpen} title={isIn ? "Scan destination shelf" : "Scan source shelf"} onClose={() => setScanOpen(false)} onDetected={onScan} />
    </div>
  );
}
