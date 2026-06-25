import { useMemo, useState } from "react";
import { ZONE_INDEX } from "@/constants/zones";
import { useEntries } from "@/hooks/useEntries";
import { useAssignItemCode, entryCode, entryNeedsCode } from "@/hooks/useAssignItemCode";
import { Barcode } from "@/components/Barcode";
import { downloadLabelsPdf, type LabelData } from "@/lib/labels";
import { ShelfLabels } from "./ShelfLabels";
import { ShelfCoverage } from "./ShelfCoverage";
import { toast } from "@/stores/toast";
import { errMessage } from "@/lib/errors";
import type { EntryRow } from "@/types/entry";

function metaFor(e: EntryRow): string {
  return [e.defn, e.category, ZONE_INDEX[e.zone_code]?.code ?? e.zone_code].filter(Boolean).join(" · ");
}

export function BarcodesScreen() {
  const { data: entries = [], isLoading } = useEntries();
  const assign = useAssignItemCode();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => [...entries].reverse(), [entries]);
  const needing = useMemo(() => entries.filter(entryNeedsCode), [entries]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function assignAll() {
    if (!needing.length) return;
    setBusy(true);
    let n = 0;
    try {
      for (const e of needing) {
        await assign.mutateAsync(e.id);
        n++;
      }
      toast(`Assigned ${n} code${n === 1 ? "" : "s"}`, "ok");
    } catch (e) {
      toast(`Assigned ${n}, then failed: ` + errMessage(e), "err");
    } finally {
      setBusy(false);
    }
  }

  async function assignOne(id: string) {
    try {
      const code = await assign.mutateAsync(id);
      toast(`Assigned ${code}`, "ok");
    } catch (e) {
      toast("Assign failed: " + errMessage(e), "err");
    }
  }

  async function download() {
    const labels: LabelData[] = rows
      .filter((e) => selected.has(e.id))
      .map((e) => ({ code: entryCode(e) ?? "", name: e.name, meta: metaFor(e), qty: e.qty }))
      .filter((l) => l.code);
    if (!labels.length) {
      toast("Select coded items first", "warn");
      return;
    }
    try {
      await downloadLabelsPdf(labels);
      toast(`Downloaded ${labels.length} label${labels.length === 1 ? "" : "s"}`, "ok");
    } catch (e) {
      toast("PDF failed: " + errMessage(e), "err");
    }
  }

  return (
    <div className="min-h-screen bg-brand-cream text-brand-ink">
      <header className="px-4 pt-5 pb-2">
        <div className="text-xs font-bold uppercase tracking-widest text-brand-mute">U&amp;M StockHub</div>
        <h1 className="text-xl font-bold">Barcodes</h1>
        <p className="text-sm text-brand-mute">
          {entries.length} items · {needing.length} need a code · {selected.size} selected
        </p>
      </header>

      <div className="px-4 flex gap-2 flex-wrap">
        <button
          onClick={assignAll}
          disabled={busy || needing.length === 0}
          className="rounded-lg bg-brand-accent-2 text-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
        >
          {busy ? "Assigning…" : `Assign codes to ${needing.length} NEW`}
        </button>
        <button
          onClick={download}
          disabled={selected.size === 0}
          className="rounded-lg border border-brand-line px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
        >
          ⬇ Download {selected.size} label{selected.size === 1 ? "" : "s"} (PDF)
        </button>
      </div>

      <main className="px-4 pb-24 pt-3 max-w-md mx-auto">
        {isLoading && <p className="text-sm text-brand-mute text-center mt-8">Loading…</p>}
        {!isLoading && rows.length === 0 && (
          <p className="text-sm text-brand-mute text-center mt-12">🏷️ No items captured yet.</p>
        )}

        <ul className="space-y-2">
          {rows.map((e) => {
            const code = entryCode(e);
            const isSel = selected.has(e.id);
            return (
              <li key={e.id} className="bg-white border border-brand-line rounded-xl p-3">
                <div className="flex items-start gap-3">
                  {code ? (
                    <button
                      onClick={() => toggle(e.id)}
                      className={`shrink-0 w-6 h-6 rounded border flex items-center justify-center text-xs ${
                        isSel ? "bg-brand-accent-2 text-white border-brand-accent-2" : "border-brand-line"
                      }`}
                      aria-label="select for printing"
                    >
                      {isSel ? "✓" : ""}
                    </button>
                  ) : (
                    <div className="shrink-0 w-6 h-6" />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-mono font-bold text-brand-accent-2">
                      {code ?? "— no code —"}
                      <span className="ml-1 text-brand-mute font-sans font-normal">
                        {e.master_code ? "· existing" : code ? "· NEW" : ""}
                      </span>
                    </div>
                    <div className="text-sm text-brand-ink truncate">{e.name}</div>
                    <div className="text-xs text-brand-mute truncate">{metaFor(e)}</div>
                    {code ? (
                      <div className="mt-2">
                        <Barcode value={code} />
                      </div>
                    ) : (
                      <button
                        onClick={() => assignOne(e.id)}
                        disabled={assign.isPending}
                        className="mt-2 rounded-lg border border-brand-accent-2 text-brand-accent-2 px-3 py-1 text-xs font-semibold"
                      >
                        Assign ITM code
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <ShelfCoverage />
        <ShelfLabels />
      </main>
    </div>
  );
}
