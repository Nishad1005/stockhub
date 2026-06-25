import { ZONE_INDEX } from "@/constants/zones";
import type { MovementRow } from "@/types/movement";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export interface MovementDetailModalProps {
  movement: MovementRow;
  onClose: () => void;
}

export function MovementDetailModal({ movement: m, onClose }: MovementDetailModalProps) {
  const isIn = m.type === "IN";
  const discrepancy = m.type === "OUT" && m.available_qty != null && m.qty > m.available_qty;

  const footer = (
    <Button variant="secondary" fullWidth onClick={onClose}>Close</Button>
  );

  return (
    <Modal title={<span className="font-mono font-bold text-brand-accent-2">{m.ref_number}</span>} onClose={onClose} footer={footer}>
      <div className="text-xs text-brand-mute mb-3">{new Date(m.created_at).toLocaleString()}</div>

      <Badge tone={isIn ? "ok" : "bad"}>{isIn ? "STOCK IN" : "STOCK OUT"}</Badge>

      <div className="mt-3 mb-3">
        <div className="text-sm font-medium text-brand-ink">
          {m.item_code && <Badge tone="ok" className="mr-1.5">{m.item_code}</Badge>}
          {m.item_name}
        </div>
        <div className="text-xs text-brand-mute mt-1">
          {m.shelf_code} · {ZONE_INDEX[m.zone_code]?.name ?? m.zone_code}
        </div>
      </div>

      <div className="mb-3">
        <div className="text-[10px] font-bold uppercase tracking-wide text-brand-mute">Quantity</div>
        <div className="font-mono text-2xl font-bold text-brand-accent-2">{m.qty}</div>
        {discrepancy && (
          <Badge tone="bad" dot className="mt-0.5">
            Issued {m.qty}, only {m.available_qty} on hand (short {m.qty - (m.available_qty as number)})
          </Badge>
        )}
      </div>

      <div className="rounded-lg bg-brand-cream p-3 text-xs space-y-1">
        <div><b>{isIn ? "Supplier / source" : "Department / destination"}:</b> {m.source_or_dest}</div>
        {m.reason && <div><b>Reason:</b> {m.reason}</div>}
        {m.authorized_by && <div><b>Authorized by:</b> {m.authorized_by}</div>}
        {m.notes && <div><b>Notes:</b> {m.notes}</div>}
      </div>
    </Modal>
  );
}
