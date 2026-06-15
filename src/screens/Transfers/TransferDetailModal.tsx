import { ZONE_INDEX } from "@/constants/zones";
import type { TransferRow } from "@/types/transfer";

export interface TransferDetailModalProps {
  transfer: TransferRow;
  onClose: () => void;
}

/** Read-only STN detail — ports v0.1 openTransferDetail(). */
export function TransferDetailModal({ transfer: t, onClose }: TransferDetailModalProps) {
  const zoneName = (code: string) => ZONE_INDEX[code]?.name ?? code;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-2xl p-5 max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-mono font-bold text-brand-accent-2">{t.stn_number}</h2>
          <button onClick={onClose} className="text-brand-mute text-lg leading-none px-1">✕</button>
        </div>

        <div className="text-xs text-brand-mute mb-3">{new Date(t.created_at).toLocaleString()}</div>

        <div className="mb-3">
          <div className="text-[10px] font-bold uppercase tracking-wide text-brand-mute">Item</div>
          <div className="text-sm font-medium text-brand-ink">
            {t.item_code && (
              <span className="mr-1.5 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-brand-ok/15 text-brand-ok">
                {t.item_code}
              </span>
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
              <span className="text-brand-ok">✓ Deducted from source entry</span>
            ) : (
              <span className="text-brand-warn">⚠ Audit-only (no source entry found to deduct)</span>
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

        <button onClick={onClose} className="mt-4 w-full rounded-lg border border-brand-line py-2 text-sm font-semibold">
          Close
        </button>
      </div>
    </div>
  );
}
