import { ZONE_INDEX } from "@/constants/zones";
import type { TransferRow } from "@/types/transfer";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export interface TransferDetailModalProps {
  transfer: TransferRow;
  onClose: () => void;
}

/** Read-only STN detail — ports v0.1 openTransferDetail(). */
export function TransferDetailModal({ transfer: t, onClose }: TransferDetailModalProps) {
  const zoneName = (code: string) => ZONE_INDEX[code]?.name ?? code;
  const footer = (
    <Button variant="secondary" fullWidth onClick={onClose}>Close</Button>
  );
  return (
    <Modal title={<span className="font-mono font-bold text-brand-accent-2">{t.stn_number}</span>} onClose={onClose} footer={footer}>
      <div className="text-xs text-brand-mute mb-3">{new Date(t.created_at).toLocaleString()}</div>

      <div className="mb-3">
        <div className="text-[10px] font-bold uppercase tracking-wide text-brand-mute">Item</div>
        <div className="text-sm font-medium text-brand-ink">
          {t.item_code && (
            <Badge tone="ok" className="mr-1.5">{t.item_code}</Badge>
          )}
          {t.item_name}
        </div>
        {(t.item_defn || t.item_category) && (
          <div className="text-xs text-brand-mute">{[t.item_defn, t.item_category].filter(Boolean).join(" · ")}</div>
        )}
      </div>

      <div className="flex items-stretch gap-2 mb-3">
        <div className="flex-1 rounded-lg bg-brand-bad/10 p-3">
          <div className="text-[10px] font-bold uppercase tracking-wide text-brand-bad">From</div>
          <div className="font-mono font-bold text-brand-bad">{t.source_zone}</div>
          <div className="text-xs text-brand-mute">{zoneName(t.source_zone)}</div>
          <div className="text-xs font-mono text-brand-ink mt-1">{t.source_shelf}</div>
        </div>
        <div className="flex items-center text-brand-accent-2 text-xl">→</div>
        <div className="flex-1 rounded-lg bg-brand-ok/10 p-3">
          <div className="text-[10px] font-bold uppercase tracking-wide text-brand-ok">To</div>
          <div className="font-mono font-bold text-brand-ok">{t.dest_zone}</div>
          <div className="text-xs text-brand-mute">{zoneName(t.dest_zone)}</div>
          <div className="text-xs font-mono text-brand-ink mt-1">{t.dest_shelf}</div>
        </div>
      </div>

      <div className="mb-3">
        <div className="text-[10px] font-bold uppercase tracking-wide text-brand-mute">Quantity</div>
        <div className="font-mono text-2xl font-bold text-brand-accent-2">{t.qty}</div>
        <div className="text-xs mt-0.5">
          {t.source_deducted ? (
            <Badge tone="ok" dot>Deducted from source entry</Badge>
          ) : (
            <Badge tone="warn" dot>Audit-only (no source entry found to deduct)</Badge>
          )}
        </div>
      </div>

      {t.reason && (
        <div className="mb-3">
          <div className="text-[10px] font-bold uppercase tracking-wide text-brand-mute">Reason</div>
          <div className="text-sm text-brand-ink">{t.reason}</div>
        </div>
      )}

      {(t.storekeeper || t.helper) && (
        <div className="rounded-lg bg-brand-cream p-3 text-xs">
          <div className="text-[10px] font-bold uppercase tracking-wide text-brand-mute mb-1">Signatures</div>
          {t.storekeeper && <div><b>Storekeeper:</b> {t.storekeeper}</div>}
          {t.helper && <div><b>Helper:</b> {t.helper}</div>}
        </div>
      )}
    </Modal>
  );
}
