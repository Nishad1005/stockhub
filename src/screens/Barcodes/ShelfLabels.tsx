import { useMemo, useState } from "react";
import { useShelves } from "@/hooks/useShelves";
import { ZONE_INDEX } from "@/constants/zones";
import { buildShelfLabelsPdf } from "@/lib/shelfLabelPdf";
import { toast } from "@/stores/toast";
import { errMessage } from "@/lib/errors";

export function ShelfLabels() {
  const { data: shelves = [] } = useShelves();
  const [zone, setZone] = useState("");
  const [busy, setBusy] = useState(false);

  const zones = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of shelves) counts.set(s.zone_code, (counts.get(s.zone_code) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [shelves]);

  async function download() {
    if (!zone) {
      toast("Pick a zone", "warn");
      return;
    }
    setBusy(true);
    try {
      await buildShelfLabelsPdf(zone, shelves);
      toast("Shelf labels downloaded", "ok");
    } catch (e) {
      toast("PDF failed: " + errMessage(e), "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bg-white border border-brand-line rounded-xl p-4 mt-4">
      <h2 className="text-xs font-bold uppercase tracking-wide text-brand-mute mb-1">Shelf labels</h2>
      <p className="text-[11px] text-brand-mute mb-2">Reprint a zone's shelf barcodes (matches the existing labels).</p>
      <div className="flex gap-2">
        <select value={zone} onChange={(e) => setZone(e.target.value)} className="flex-1 rounded-lg border border-brand-line px-3 py-2 text-sm">
          <option value="">— choose zone —</option>
          {zones.map(([z, c]) => (
            <option key={z} value={z}>{z} · {ZONE_INDEX[z]?.name ?? z} ({c} shelves)</option>
          ))}
        </select>
        <button onClick={download} disabled={busy || !zone} className="rounded-lg bg-brand-accent-2 text-white font-semibold px-3 text-sm disabled:opacity-50">
          {busy ? "…" : "⬇ PDF"}
        </button>
      </div>
    </section>
  );
}
