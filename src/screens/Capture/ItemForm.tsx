import { useEffect, useState } from "react";
import { ZONE_INDEX } from "@/constants/zones";
import { MasterSearch } from "@/components/MasterSearch";
import { PhotoCapture } from "@/components/PhotoCapture";
import { CameraScanner } from "@/components/CameraScanner";
import { useMasterItems } from "@/hooks/useMasterItems";
import { findMasterByCode } from "@/lib/masterSearch";
import { validateShelf } from "@/lib/shelf-validator";
import { toast } from "@/stores/toast";
import type { MasterItem } from "@/types/master";

export interface ItemFormPayload {
  name: string;
  defn: string;
  category: string;
  qty: string;
  notes: string;
  masterCode: string | null;
  scannedBarcode: string | null;
  photoDataUrl: string | null;
}

export interface ItemFormProps {
  activeZone: string | null;
  submitting: boolean;
  /** Persist the entry. Resolve → form resets (keeps category); reject → keep values. */
  onSubmit: (payload: ItemFormPayload) => Promise<void>;
}

const NAME_INPUT_ID = "captureName";

/** Item entry form: name+master typeahead, defn/cat/qty/notes, photo (v0.1 ItemForm). */
export function ItemForm({ activeZone, submitting, onSubmit }: ItemFormProps) {
  const [name, setName] = useState("");
  const [defn, setDefn] = useState("");
  const [category, setCategory] = useState("");
  const [qty, setQty] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [masterCode, setMasterCode] = useState<string | null>(null);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);

  const { data: master = [] } = useMasterItems();

  // Prefill category from the zone default when empty (v0.1 selectZone/applyShelfFromInput).
  useEffect(() => {
    if (!activeZone) return;
    const def = ZONE_INDEX[activeZone]?.defaultCat;
    if (def) setCategory((c) => (c.trim() ? c : def));
  }, [activeZone]);

  function pick(it: MasterItem) {
    setName(it.name);
    if (it.definition) setDefn(it.definition);
    if (it.category) setCategory(it.category);
    setMasterCode(it.code);
    setScannedBarcode(null);
  }

  function onNameChange(v: string) {
    setName(v);
    // Typing a fresh name clears a prior master match (v0.1 behavior).
    if (masterCode) setMasterCode(null);
  }

  // Scan a printed item label (encodes the StockHub code, e.g. "ITM-01132").
  function onItemScan(decoded: string) {
    setScanOpen(false);
    // A location code scanned here is almost certainly a mistake — guide the user.
    if (validateShelf(decoded).ok) {
      toast("That's a shelf code — use 📷 Scan at the top to set the shelf", "warn");
      return;
    }
    const hit = findMasterByCode(master, decoded);
    if (hit) {
      pick(hit);
      toast(`Matched ${hit.code}`, "ok");
      return;
    }
    // Unknown code → keep it as a scanned barcode; worker types the name.
    setMasterCode(null);
    setScannedBarcode(decoded.trim());
    toast(`Scanned ${decoded.trim()} — not in master, type the item name`, "warn");
    setTimeout(() => document.getElementById(NAME_INPUT_ID)?.focus(), 50);
  }

  async function save() {
    if (!name.trim()) {
      toast("Item name is required", "warn");
      document.getElementById(NAME_INPUT_ID)?.focus();
      return;
    }
    try {
      await onSubmit({ name, defn, category, qty, notes, masterCode, scannedBarcode, photoDataUrl: photo });
      // Reset for the next item — keep category (sticky, like the shelf).
      setName("");
      setDefn("");
      setQty("");
      setNotes("");
      setPhoto(null);
      setMasterCode(null);
      setScannedBarcode(null);
      setTimeout(() => document.getElementById(NAME_INPUT_ID)?.focus(), 50);
    } catch {
      /* error toast handled by caller; keep the form intact */
    }
  }

  const badge = masterCode
    ? { cls: "bg-brand-ok text-white", text: `✓ MATCHED ${masterCode}` }
    : scannedBarcode
      ? { cls: "bg-brand-accent-2 text-white", text: `📷 SCANNED ${scannedBarcode}` }
      : name.trim().length >= 4
        ? { cls: "bg-brand-warn text-white", text: "★ NEW ITEM" }
        : null;

  return (
    <div className="bg-white rounded-xl border border-brand-line p-4 space-y-3">
      <div>
        <label htmlFor={NAME_INPUT_ID} className="block text-xs font-semibold text-brand-mute mb-1">
          Item name <span className="text-brand-bad">*</span>
        </label>
        <MasterSearch inputId={NAME_INPUT_ID} value={name} onChange={onNameChange} onPick={pick} autoFocus />
        <button
          type="button"
          onClick={() => setScanOpen(true)}
          className="mt-2 w-full rounded-lg border border-brand-line py-2 text-sm font-semibold text-brand-ink"
        >
          📷 Scan item barcode
        </button>
        {badge && (
          <span className={`inline-block mt-2 text-xs font-semibold rounded px-2 py-0.5 ${badge.cls}`}>
            {badge.text}
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-brand-mute mb-1">Definition</label>
          <input
            value={defn}
            onChange={(e) => setDefn(e.target.value)}
            className="w-full rounded-lg border border-brand-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
          />
        </div>
        <div className="w-28">
          <label className="block text-xs font-semibold text-brand-mute mb-1">Qty</label>
          <input
            type="number"
            min={0}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="—"
            className="w-full rounded-lg border border-brand-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-brand-mute mb-1">Category</label>
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-lg border border-brand-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-brand-mute mb-1">Notes</label>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-lg border border-brand-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-brand-mute mb-1">Photo</label>
        <PhotoCapture value={photo} onChange={setPhoto} />
      </div>

      <button
        type="button"
        onClick={save}
        disabled={submitting}
        className="w-full rounded-lg bg-brand-accent-2 text-white font-semibold py-2.5 text-sm disabled:opacity-60"
      >
        {submitting ? "Saving…" : "Save entry"}
      </button>

      <CameraScanner
        open={scanOpen}
        title="Scan item barcode"
        onClose={() => setScanOpen(false)}
        onDetected={onItemScan}
      />
    </div>
  );
}
