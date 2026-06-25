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
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { Camera, Home } from "@/components/ui/icons";

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
  const [homeSection, setHomeSection] = useState<string | null>(null);
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
    setHomeSection(it.section);
    setScannedBarcode(null);
  }

  function onNameChange(v: string) {
    setName(v);
    // Typing a fresh name clears a prior master match (v0.1 behavior).
    if (masterCode) {
      setMasterCode(null);
      setHomeSection(null);
    }
  }

  // Scan a printed item label (encodes the StockHub code, e.g. "ITM-01132").
  function onItemScan(decoded: string) {
    setScanOpen(false);
    // A location code scanned here is almost certainly a mistake — guide the user.
    if (validateShelf(decoded).ok) {
      toast("That's a shelf code — use the Scan button at the top to set the shelf", "warn");
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
    setHomeSection(null);
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
      setHomeSection(null);
      setTimeout(() => document.getElementById(NAME_INPUT_ID)?.focus(), 50);
    } catch {
      /* error toast handled by caller; keep the form intact */
    }
  }

  const badgeInfo: { tone: "ok" | "warn" | "neutral"; text: string } | null = masterCode
    ? { tone: "ok", text: `✓ MATCHED ${masterCode}` }
    : scannedBarcode
      ? { tone: "neutral", text: `SCANNED ${scannedBarcode}` }
      : name.trim().length >= 4
        ? { tone: "warn", text: "NEW ITEM" }
        : null;

  return (
    <div className="bg-white rounded-xl border border-brand-line p-4 space-y-3">
      <div>
        <Label htmlFor={NAME_INPUT_ID} required>Item name</Label>
        <MasterSearch inputId={NAME_INPUT_ID} value={name} onChange={onNameChange} onPick={pick} autoFocus />
        <Button
          type="button"
          variant="secondary"
          fullWidth
          size="sm"
          icon={<Camera className="w-4 h-4" />}
          onClick={() => setScanOpen(true)}
          className="mt-2"
        >
          Scan item barcode
        </Button>
        {badgeInfo && (
          <Badge tone={badgeInfo.tone} className="mt-2">
            {badgeInfo.text}
          </Badge>
        )}
        {homeSection && (
          <p className="mt-1.5 text-xs text-brand-mute flex items-center gap-1">
            <Home className="w-3 h-3" />
            Home area: <span className="font-semibold text-brand-accent-2">{homeSection}</span>
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <Label>Definition</Label>
          <Input
            value={defn}
            onChange={(e) => setDefn(e.target.value)}
          />
        </div>
        <div className="w-28">
          <Label>Qty</Label>
          <Input
            type="number"
            min={0}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="—"
          />
        </div>
      </div>

      <div>
        <Label>Category</Label>
        <Input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
      </div>

      <div>
        <Label>Notes</Label>
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div>
        <Label>Photo</Label>
        <PhotoCapture value={photo} onChange={setPhoto} />
      </div>

      <Button
        type="button"
        variant="primary"
        fullWidth
        onClick={save}
        disabled={submitting}
        loading={submitting}
      >
        {submitting ? "Saving…" : "Save entry"}
      </Button>

      <CameraScanner
        open={scanOpen}
        title="Scan item barcode"
        onClose={() => setScanOpen(false)}
        onDetected={onItemScan}
      />
    </div>
  );
}
