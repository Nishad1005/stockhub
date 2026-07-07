import { useState } from "react";
import { MasterSearch } from "@/components/MasterSearch";
import { CameraScanner } from "@/components/CameraScanner";
import { useMasterItems } from "@/hooks/useMasterItems";
import { useGrnLines } from "@/hooks/useGrnLines";
import { findMasterByCode } from "@/lib/masterSearch";
import { validateShelf } from "@/lib/shelf-validator";
import { errMessage } from "@/lib/errors";
import { toast } from "@/stores/toast";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { Camera } from "@/components/ui/icons";
import type { MasterItem } from "@/types/master";
import type { GrnLineDetail } from "@/types/grn";

export interface GrnLineEditorProps {
  grnId: string;
  /** Provided → edit that line; null/undefined → add a new line. */
  line?: GrnLineDetail | null;
  onDone: () => void;
}

const NAME_INPUT_ID = "grnLineName";

/** Empty string → null; otherwise a finite non-negative number, else null. */
function parseQty(s: string): number | null {
  const t = s.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Add / edit a GRN invoice line (Stage 2, DRAFT only). Three item-input paths,
 * mirroring Capture's ItemForm: scan a barcode → master lookup, type-ahead against
 * master, or type a NEW name (item_code stays null). PO + invoice qty are keyed
 * off the paper invoice; received qty is recorded later on the line row.
 */
export function GrnLineEditor({ grnId, line, onDone }: GrnLineEditorProps) {
  const editing = !!line;
  const { addLine, updateLine } = useGrnLines();
  const { data: master = [] } = useMasterItems();

  const [name, setName] = useState(line?.itemName ?? "");
  const [itemCode, setItemCode] = useState<string | null>(line?.itemCode ?? null);
  const [poQty, setPoQty] = useState(line?.poQty == null ? "" : String(line.poQty));
  const [invoiceQty, setInvoiceQty] = useState(line?.invoiceQty == null ? "" : String(line.invoiceQty));
  const [scanOpen, setScanOpen] = useState(false);

  const busy = addLine.isPending || updateLine.isPending;

  function pick(it: MasterItem) {
    setName(it.name);
    setItemCode(it.code);
  }

  function onNameChange(v: string) {
    setName(v);
    if (itemCode) setItemCode(null); // typing a fresh name drops the master match
  }

  function onItemScan(decoded: string) {
    setScanOpen(false);
    if (validateShelf(decoded).ok) {
      toast("That's a shelf code, not an item barcode", "warn");
      return;
    }
    const hit = findMasterByCode(master, decoded);
    if (hit) {
      pick(hit);
      toast(`Matched ${hit.code}`, "ok");
      return;
    }
    // Unknown code → NEW item; worker types the name (barcode has no column here).
    setItemCode(null);
    toast(`Scanned ${decoded.trim()} — not in master, type the item name`, "warn");
    setTimeout(() => document.getElementById(NAME_INPUT_ID)?.focus(), 50);
  }

  function save() {
    if (!name.trim()) {
      toast("Item name is required", "warn");
      document.getElementById(NAME_INPUT_ID)?.focus();
      return;
    }
    const payload = {
      grnId,
      itemCode,
      itemName: name,
      poQty: parseQty(poQty),
      invoiceQty: parseQty(invoiceQty),
    };
    const onError = (e: Error) => toast("Save failed: " + errMessage(e), "err");
    if (editing && line) {
      updateLine.mutate(
        { ...payload, id: line.id, receivedQty: line.receivedQty },
        { onSuccess: onDone, onError },
      );
    } else {
      addLine.mutate(payload, { onSuccess: onDone, onError });
    }
  }

  const badge = itemCode
    ? { tone: "ok" as const, text: `✓ MATCHED ${itemCode}` }
    : name.trim().length >= 4
      ? { tone: "warn" as const, text: "NEW ITEM" }
      : null;

  return (
    <Card className="p-4 space-y-3 border-brand-accent">
      <div className="text-xs font-bold uppercase tracking-wide text-brand-mute">
        {editing ? `Edit line ${line?.lineNumber}` : "Add line"}
      </div>

      <div>
        <Label htmlFor={NAME_INPUT_ID} required>Item</Label>
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
        {badge && <Badge tone={badge.tone} className="mt-2">{badge.text}</Badge>}
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <Label htmlFor="grnLinePo">PO qty</Label>
          <Input
            id="grnLinePo"
            type="number"
            min={0}
            inputMode="numeric"
            value={poQty}
            placeholder="—"
            onChange={(e) => setPoQty(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <Label htmlFor="grnLineInvoice">Invoice qty</Label>
          <Input
            id="grnLineInvoice"
            type="number"
            min={0}
            inputMode="numeric"
            value={invoiceQty}
            placeholder="—"
            onChange={(e) => setInvoiceQty(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" fullWidth onClick={onDone} disabled={busy}>
          Cancel
        </Button>
        <Button variant="primary" fullWidth onClick={save} disabled={busy} loading={busy}>
          {editing ? "Save" : "Add line"}
        </Button>
      </div>

      <CameraScanner
        open={scanOpen}
        title="Scan item barcode"
        onClose={() => setScanOpen(false)}
        onDetected={onItemScan}
      />
    </Card>
  );
}
