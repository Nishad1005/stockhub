import { useMemo, useState } from "react";
import { MasterSearch } from "@/components/MasterSearch";
import { CameraScanner } from "@/components/CameraScanner";
import { useEntries } from "@/hooks/useEntries";
import { useCreateMovement } from "@/hooks/useCreateMovement";
import { useSessionStore } from "@/stores/session";
import { useShelfChecker } from "@/hooks/useShelves";
import { findSourceEntry } from "@/lib/transferMatch";
import { validateShelf } from "@/lib/shelf-validator";
import { ZONE_INDEX } from "@/constants/zones";
import { toast } from "@/stores/toast";
import { errMessage } from "@/lib/errors";
import type { MasterItem } from "@/types/master";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { Camera } from "@/components/ui/icons";

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
  const checkShelf = useShelfChecker();

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

  const footer = (
    <>
      <Button variant="secondary" fullWidth onClick={onClose}>Cancel</Button>
      <Button variant="primary" fullWidth loading={create.isPending} onClick={save}>
        {create.isPending ? "Saving…" : isIn ? "Receive stock" : "Issue stock"}
      </Button>
    </>
  );

  return (
    <>
      <Modal title={isIn ? "Stock IN (GRN)" : "Stock OUT (MIR)"} onClose={onClose} footer={footer}>
        <div className="space-y-3">
          <div>
            <Label required>Item</Label>
            <MasterSearch value={itemName} onChange={onNameChange} onPick={pick} />
            {itemCode && <Badge tone="ok" dot className="mt-1.5">✓ {itemCode}</Badge>}
          </div>

          <div>
            <Label tone={isIn ? "ok" : "bad"} required>{isIn ? "To shelf" : "From shelf"}</Label>
            <div className="flex gap-1">
              <Input
                mono
                value={shelfCode}
                readOnly={!manualEntryMode}
                onChange={(e) => setShelfCode(e.target.value.toUpperCase())}
                placeholder={manualEntryMode ? "Z3-S042" : "Scan →"}
              />
              <Button variant="primary" size="sm" icon={<Camera className="w-4 h-4" />} onClick={() => setScanOpen(true)} aria-label="Scan shelf" />
            </div>
            {zone && <div className="text-[11px] text-brand-mute mt-0.5">{zone} · {ZONE_INDEX[zone]?.name}</div>}
            {checkShelf(shelfCode) === false && <div className="text-[11px] text-brand-warn mt-0.5">⚠ Not a registered shelf</div>}
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
            <Label required>Quantity</Label>
            <Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="—" />
          </div>

          <div>
            <Label required>{isIn ? "Supplier / source" : "Department / destination"}</Label>
            <Input value={sourceOrDest} onChange={(e) => setSourceOrDest(e.target.value)} placeholder={isIn ? "e.g. Acme Supplies / Production" : "e.g. Stitching / Dispatch / Scrap"} />
          </div>

          <div>
            <Label>Reason</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label>Authorized by</Label>
              <Input value={authorizedBy} onChange={(e) => setAuthorizedBy(e.target.value)} />
            </div>
            <div className="flex-1">
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        </div>
      </Modal>

      <CameraScanner open={scanOpen} title={isIn ? "Scan destination shelf" : "Scan source shelf"} onClose={() => setScanOpen(false)} onDetected={onScan} />
    </>
  );
}
