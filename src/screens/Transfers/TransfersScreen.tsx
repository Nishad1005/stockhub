import { useMemo, useState } from "react";
import { useTransfers } from "@/hooks/useTransfers";
import { usePermissions } from "@/hooks/usePermissions";
import { transferStats } from "@/lib/transferStats";
import { NewTransferModal } from "./NewTransferModal";
import { TransferDetailModal } from "./TransferDetailModal";
import type { TransferRow } from "@/types/transfer";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Plus } from "@/components/ui/icons";

export function TransfersScreen() {
  const { data: transfers = [], isLoading, error } = useTransfers();
  const { can } = usePermissions();
  const [showNew, setShowNew] = useState(false);
  const [detail, setDetail] = useState<TransferRow | null>(null);

  const stats = useMemo(() => transferStats(transfers), [transfers]);

  return (
    <div className="min-h-screen bg-brand-cream text-brand-ink">
      <ScreenHeader
        title="Transfers"
        subtitle="Move stock between shelves with an STN audit trail"
        action={
          can("transfer") ? (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setShowNew(true)}
            >
              New Transfer
            </Button>
          ) : undefined
        }
      />

      <main className="px-4 pb-24 max-w-md mx-auto space-y-4">
        <Card className="p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold uppercase tracking-wide text-brand-mute">
              {stats.total} transfer{stats.total === 1 ? "" : "s"}
            </span>
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
        </Card>

        <Card className="p-2">
          {isLoading && <p className="text-sm text-brand-mute p-3 text-center">Loading…</p>}
          {error && <p className="text-sm text-brand-bad p-3 text-center">Failed to load transfers.</p>}
          {!isLoading && !error && transfers.length === 0 && (
            <p className="text-sm text-brand-mute p-6 text-center">
              No transfers yet. Tap "New Transfer" to record your first stock movement.
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
                        <Badge tone="ok" className="mr-1">
                          {t.item_code}
                        </Badge>
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
        </Card>
      </main>

      {showNew && <NewTransferModal onClose={() => setShowNew(false)} />}
      {detail && <TransferDetailModal transfer={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
