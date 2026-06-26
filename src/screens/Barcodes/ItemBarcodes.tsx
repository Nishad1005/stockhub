import { useMemo, useState } from "react";
import { ZONE_INDEX } from "@/constants/zones";
import { useEntries } from "@/hooks/useEntries";
import { useAssignItemCode, entryCode, entryNeedsCode } from "@/hooks/useAssignItemCode";
import { Barcode } from "@/components/Barcode";
import { downloadLabelsPdf, type LabelData } from "@/lib/labels";
import { zonesPresent } from "@/lib/barcodeZones";
import { toast } from "@/stores/toast";
import { errMessage } from "@/lib/errors";
import type { EntryRow } from "@/types/entry";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Download, Tag } from "@/components/ui/icons";

function metaFor(e: EntryRow): string {
  return [e.defn, e.category, ZONE_INDEX[e.zone_code]?.code ?? e.zone_code].filter(Boolean).join(" · ");
}

/** Item-barcode tab: bulk assign/download, zone filter chips, and the item list. */
export function ItemBarcodes() {
  const { data: entries = [], isLoading } = useEntries();
  const assign = useAssignItemCode();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [zone, setZone] = useState("all");

  const needing = useMemo(() => entries.filter(entryNeedsCode), [entries]);
  const zones = useMemo(() => zonesPresent(entries), [entries]);
  const rows = useMemo(() => {
    const reversed = [...entries].reverse();
    return zone === "all" ? reversed : reversed.filter((e) => e.zone_code === zone);
  }, [entries, zone]);

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
    const labels: LabelData[] = [...entries]
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
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <Button variant="primary" size="sm" onClick={assignAll} disabled={busy || needing.length === 0} loading={busy}>
          {busy ? "Assigning…" : `Assign codes to ${needing.length} NEW`}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<Download className="w-4 h-4" />}
          onClick={download}
          disabled={selected.size === 0}
        >
          Download {selected.size} label{selected.size === 1 ? "" : "s"} (PDF)
        </Button>
      </div>

      {zones.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Chip active={zone === "all"} onClick={() => setZone("all")}>All</Chip>
          {zones.map((z) => (
            <Chip key={z.zone} active={zone === z.zone} onClick={() => setZone(z.zone)}>
              {ZONE_INDEX[z.zone]?.code ?? z.zone} · {z.count}
            </Chip>
          ))}
        </div>
      )}

      {isLoading && <p className="text-sm text-brand-mute text-center mt-8">Loading…</p>}
      {!isLoading && rows.length === 0 && (
        <p className="text-sm text-brand-mute text-center mt-12 flex flex-col items-center gap-2">
          <Tag className="w-8 h-8 text-brand-mute" />
          {entries.length === 0 ? "No items captured yet." : "No items in this zone."}
        </p>
      )}

      <ul className="space-y-2">
        {rows.map((e) => {
          const code = entryCode(e);
          const isSel = selected.has(e.id);
          return (
            <li key={e.id}>
              <Card className="p-3">
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
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => assignOne(e.id)}
                        disabled={assign.isPending}
                        className="mt-2"
                      >
                        Assign ITM code
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
