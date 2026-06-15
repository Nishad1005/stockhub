import { useMemo, useState } from "react";
import { useTransfers } from "@/hooks/useTransfers";
import { transferStats } from "@/lib/transferStats";
import { NewTransferModal } from "./NewTransferModal";
import { TransferDetailModal } from "./TransferDetailModal";
import type { TransferRow } from "@/types/transfer";

export function TransfersScreen() {
  const { data: transfers = [], isLoading, error } = useTransfers();
  const [showNew, setShowNew] = useState(false);
  const [detail, setDetail] = useState<TransferRow | null>(null);

  const stats = useMemo(() => transferStats(transfers), [transfers]);

  return (
    <div className="min-h-screen bg-brand-cream text-brand-ink">
      <header className="px-4 pt-5 pb-2">
        <div className="text-xs font-bold uppercase tracking-widest text-brand-mute">U&amp;M StockHub</div>
        <h1 className="text-xl font-bold">Transfers</h1>
        <p className="text-sm text-brand-mute">Move stock between shelves with an STN audit trail</p>
      </header>

      <main className="px-4 pb-24 max-w-md mx-auto space-y-4">
        <section className="bg-white border border-brand-line rounded-xl p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold uppercase tracking-wide text-brand-mute">
              {stats.total} transfer{stats.total === 1 ? "" : "s"}
            </span>
            <button onClick={() => setShowNew(true)} className="rounded-lg bg-brand-accent-2 text-white font-semibold px-3 py-1.5 text-sm">
              ＋ New Transfer
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { n: stats.today, l: "Today" },
              { n: stats.week, l: "This week" },
              { n: stats.total, l: "Total" },
            ].map((s) => (
              <div key={s.l} className="rounded-lg bg-brand-accent-soft/50 p-3 text-center">
                <div className="text-2xl font-bold font-mono text-brand-ink">{s.n}</div>
                <div className="text-[10px] uppercase tracking-wide text-brand-mute">{s.l}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-brand-line rounded-xl p-2">
          {isLoading && <p className="text-sm text-brand-mute p-3 text-center">Loading…</p>}
          {error && <p className="text-sm text-brand-bad p-3 text-center">Failed to load transfers.</p>}
          {!isLoading && !error && transfers.length === 0 && (
            <p className="text-sm text-brand-mute p-6 text-center">
              🔄 No transfers yet. Tap “＋ New Transfer” to record your first stock movement.
            </p>
          )}
          <ul className="divide-y divide-brand-line">
            {transfers.map((t) => (
              <li key={t.id}>
                <button onClick={() => setDetail(t)} className="w-full text-left p-2 flex items-center gap-3">
                  <div className="font-mono text-[10px] font-bold text-brand-accent-2 w-12 shrink-0">
                    {t.stn_number.split("/").pop()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-brand-ink truncate">
                      {t.item_code && (
                        <span className="mr-1 text-[10px] font-mono font-bold px-1 py-0.5 rounded bg-brand-ok/15 text-brand-ok">
                          {t.item_code}
                        </span>
                      )}
                      {t.item_name}
                    </div>
                    <div className="text-xs text-brand-mute truncate">
                      <span className="font-mono text-brand-bad">{t.source_shelf}</span>
                      <span className="mx-1">→</span>
                      <span className="font-mono text-brand-ok">{t.dest_shelf}</span>
                      <span className="text-brand-mute"> · {new Date(t.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="font-mono font-bold text-brand-ink shrink-0">{t.qty}</div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </main>

      {showNew && <NewTransferModal onClose={() => setShowNew(false)} />}
      {detail && <TransferDetailModal transfer={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
