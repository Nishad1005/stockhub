import { ZONE_INDEX } from "@/constants/zones";
import type { MovementRow } from "@/types/movement";

export interface MovementDetailModalProps {
  movement: MovementRow;
  onClose: () => void;
}

export function MovementDetailModal({ movement: m, onClose }: MovementDetailModalProps) {
  const isIn = m.type === "IN";
  const discrepancy = m.type === "OUT" && m.available_qty != null && m.qty > m.available_qty;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-2xl p-5 max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-mono font-bold text-brand-accent-2">{m.ref_number}</h2>
          <button onClick={onClose} className="text-brand-mute text-lg leading-none px-1">✕</button>
        </div>

        <div className="text-xs text-brand-mute mb-3">{new Date(m.created_at).toLocaleString()}</div>

        <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded ${isIn ? "bg-brand-ok/15 text-brand-ok" : "bg-brand-bad/15 text-brand-bad"}`}>
          {isIn ? "STOCK IN" : "STOCK OUT"}
        </span>

        <div className="mt-3 mb-3">
          <div className="text-sm font-medium text-brand-ink">
            {m.item_code && <span className="mr-1.5 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-brand-ok/15 text-brand-ok">{m.item_code}</span>}
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
            <div className="text-xs text-brand-bad mt-0.5">
              ⚠ Issued {m.qty}, only {m.available_qty} on hand (short {m.qty - (m.available_qty as number)})
            </div>
          )}
        </div>

        <div className="rounded-lg bg-brand-cream p-3 text-xs space-y-1">
          <div><b>{isIn ? "Supplier / source" : "Department / destination"}:</b> {m.source_or_dest}</div>
          {m.reason && <div><b>Reason:</b> {m.reason}</div>}
          {m.authorized_by && <div><b>Authorized by:</b> {m.authorized_by}</div>}
          {m.notes && <div><b>Notes:</b> {m.notes}</div>}
        </div>

        <button onClick={onClose} className="mt-4 w-full rounded-lg border border-brand-line py-2 text-sm font-semibold">Close</button>
      </div>
    </div>
  );
}
