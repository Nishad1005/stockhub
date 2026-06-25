import { useMemo, useState } from "react";
import { MasterSearch } from "@/components/MasterSearch";
import { CameraScanner } from "@/components/CameraScanner";
import { useEntries } from "@/hooks/useEntries";
import { useCreateTransfer } from "@/hooks/useCreateTransfer";
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

export interface NewTransferModalProps {
  onClose: () => void;
  initialItem?: { name: string; code: string | null; defn: string | null; category: string | null };
  initialSourceShelf?: string;
}

type ScanTarget = "source" | "dest" | null;

/** Record a new transfer — ports v0.1 openTransferModal + saveTransfer. */
export function NewTransferModal({ onClose, initialItem, initialSourceShelf }: NewTransferModalProps) {
  const { data: entries = [] } = useEntries();
  const create = useCreateTransfer();
  const manualEntryMode = useSessionStore((s) => s.manualEntryMode);
  const checkShelf = useShelfChecker();

  const [itemName, setItemName] = useState(initialItem?.name ?? "");
  const [itemCode, setItemCode] = useState<string | null>(initialItem?.code ?? null);
  const [itemDefn, setItemDefn] = useState<string | null>(initialItem?.defn ?? null);
  const [itemCategory, setItemCategory] = useState<string | null>(initialItem?.category ?? null);
  const [sourceShelf, setSourceShelf] = useState(initialSourceShelf ?? "");
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

  const footer = (
    <>
      <Button variant="secondary" fullWidth onClick={onClose}>Cancel</Button>
      <Button variant="primary" fullWidth loading={create.isPending} onClick={save}>
        {create.isPending ? "Saving…" : "Save transfer"}
      </Button>
    </>
  );

  return (
    <>
      <Modal title="New Transfer (STN)" onClose={onClose} footer={footer}>
        <div className="space-y-3">
          <div>
            <Label required>Item</Label>
            <MasterSearch value={itemName} onChange={onItemNameChange} onPick={pick} />
            {itemCode && (
              <Badge tone="ok" dot className="mt-1.5">
                {itemCode}
              </Badge>
            )}
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <Label tone="bad" required>From shelf</Label>
              <div className="flex gap-1">
                <Input
                  mono
                  value={sourceShelf}
                  readOnly={!manualEntryMode}
                  onChange={(e) => setSourceShelf(e.target.value.toUpperCase())}
                  placeholder={manualEntryMode ? "Z1-S047" : "Scan →"}
                />
                <Button variant="primary" size="sm" icon={<Camera className="w-4 h-4" />} onClick={() => setScan("source")} aria-label="Scan source shelf" />
              </div>
              {sourceZone && <div className="text-[11px] text-brand-mute mt-0.5">{sourceZone} · {ZONE_INDEX[sourceZone]?.name}</div>}
              {checkShelf(sourceShelf) === false && <div className="text-[11px] text-brand-warn mt-0.5">⚠ Not a registered shelf</div>}
            </div>
            <div className="flex-1">
              <Label tone="ok" required>To shelf</Label>
              <div className="flex gap-1">
                <Input
                  mono
                  value={destShelf}
                  readOnly={!manualEntryMode}
                  onChange={(e) => setDestShelf(e.target.value.toUpperCase())}
                  placeholder={manualEntryMode ? "Z2-S012" : "Scan →"}
                />
                <Button variant="primary" size="sm" icon={<Camera className="w-4 h-4" />} onClick={() => setScan("dest")} aria-label="Scan destination shelf" />
              </div>
              {destZone && <div className="text-[11px] text-brand-mute mt-0.5">{destZone} · {ZONE_INDEX[destZone]?.name}</div>}
              {checkShelf(destShelf) === false && <div className="text-[11px] text-brand-warn mt-0.5">⚠ Not a registered shelf</div>}
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
            <Label required>Quantity</Label>
            <Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="—" />
          </div>

          <div>
            <Label>Reason</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Reallocation for production" />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <Label>Storekeeper</Label>
              <Input value={storekeeper} onChange={(e) => setStorekeeper(e.target.value)} />
            </div>
            <div className="flex-1">
              <Label>Helper</Label>
              <Input value={helper} onChange={(e) => setHelper(e.target.value)} />
            </div>
          </div>
        </div>
      </Modal>

      <CameraScanner
        open={scan !== null}
        title={scan === "source" ? "Scan SOURCE shelf" : "Scan DESTINATION shelf"}
        onClose={() => setScan(null)}
        onDetected={onScanDetected}
      />
    </>
  );
}
