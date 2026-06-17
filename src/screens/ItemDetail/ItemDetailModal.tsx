import { useMemo, useState } from "react";
import { useEntries } from "@/hooks/useEntries";
import { useMovements } from "@/hooks/useMovements";
import { useTransfers } from "@/hooks/useTransfers";
import { itemLocations, itemActivity, type ItemSelector } from "@/lib/itemDetail";
import { ZONE_INDEX } from "@/constants/zones";
import { NewTransferModal } from "@/screens/Transfers/NewTransferModal";
import { MovementModal } from "@/screens/Stock/MovementModal";
import { EditEntryModal } from "@/screens/Items/EditEntryModal";
import type { EntryRow } from "@/types/entry";

export interface ItemDetailModalProps {
  selector: ItemSelector;
  onClose: () => void;
}

type Action =
  | { kind: "transfer"; entry: EntryRow }
  | { kind: "out"; entry: EntryRow }
  | { kind: "edit"; entry: EntryRow }
  | { kind: "in" }
  | null;

export function ItemDetailModal({ selector, onClose }: ItemDetailModalProps) {
  const { data: entries = [] } = useEntries();
  const { data: movements = [] } = useMovements();
  const { data: transfers = [] } = useTransfers();
  const [action, setAction] = useState<Action>(null);

  const locations = useMemo(() => itemLocations(entries, selector), [entries, selector]);
  const activity = useMemo(() => itemActivity(movements, transfers, selector), [movements, transfers, selector]);
  const total = useMemo(() => locations.reduce((s, e) => s + (e.qty ?? 0), 0), [locations]);

  const first = locations[0];
  const code = selector.code ?? null;
  const name = first?.name ?? selector.name;
  const defn = first?.defn ?? null;
  const category = first?.category ?? null;
  const itemFields = { name, code, defn, category };

  const actBtn = "text-[11px] font-semibold rounded-lg border border-brand-line px-2 py-1";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 flex items-end sm:items-center justify-center" onClick={onClose}>
        <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-2xl p-5 max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between mb-1">
            <div className="min-w-0">
              <div className="text-sm font-bold text-brand-ink truncate">
                <span className={`mr-1.5 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${code ? "bg-brand-ok/15 text-brand-ok" : "bg-brand-warn/15 text-brand-warn"}`}>
                  {code ?? "NEW"}
                </span>
                {name}
              </div>
              {(defn || category) && <div className="text-xs text-brand-mute">{[defn, category].filter(Boolean).join(" · ")}</div>}
            </div>
            <button onClick={onClose} className="text-brand-mute text-lg leading-none px-1">✕</button>
          </div>

          <div className="flex items-center justify-between mt-2 mb-3">
            <div className="text-xs text-brand-mute">Total on hand: <span className="font-mono font-bold text-brand-ink">{total}</span></div>
            <button onClick={() => setAction({ kind: "in" })} className="rounded-lg bg-brand-ok text-white font-semibold px-3 py-1.5 text-xs">📥 Stock IN</button>
          </div>

          <div className="text-[10px] font-bold uppercase tracking-wide text-brand-mute mb-1">Locations</div>
          {locations.length === 0 ? (
            <p className="text-sm text-brand-mute mb-3">Not recorded at any shelf.</p>
          ) : (
            <ul className="divide-y divide-brand-line mb-4">
              {locations.map((e) => (
                <li key={e.id} className="py-2 flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-mono font-bold text-brand-ink">{e.shelf_code}</div>
                    <div className="text-[11px] text-brand-mute">{ZONE_INDEX[e.zone_code]?.name ?? e.zone_code} · qty {e.qty ?? "—"}</div>
                  </div>
                  <button onClick={() => setAction({ kind: "transfer", entry: e })} className={actBtn}>Move</button>
                  <button onClick={() => setAction({ kind: "out", entry: e })} className={actBtn}>Out</button>
                  <button onClick={() => setAction({ kind: "edit", entry: e })} className={actBtn}>Edit</button>
                </li>
              ))}
            </ul>
          )}

          <div className="text-[10px] font-bold uppercase tracking-wide text-brand-mute mb-1">Recent activity</div>
          {activity.length === 0 ? (
            <p className="text-sm text-brand-mute">No activity yet.</p>
          ) : (
            <ul className="space-y-1">
              {activity.map((a) => (
                <li key={a.kind + a.id} className="text-xs flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${a.kind === "IN" ? "bg-brand-ok/15 text-brand-ok" : a.kind === "OUT" ? "bg-brand-bad/15 text-brand-bad" : "bg-brand-accent-soft text-brand-accent-2"}`}>
                    {a.kind === "TRANSFER" ? "MOVE" : a.kind}
                  </span>
                  <span className="font-mono text-brand-mute shrink-0">{a.ref.split("/").pop()}</span>
                  <span className="text-brand-ink truncate">{a.summary}</span>
                  <span className="text-brand-mute ml-auto shrink-0">{new Date(a.when).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {action?.kind === "transfer" && (
        <NewTransferModal initialItem={itemFields} initialSourceShelf={action.entry.shelf_code} onClose={() => setAction(null)} />
      )}
      {action?.kind === "out" && (
        <MovementModal type="OUT" initialItem={itemFields} initialShelf={action.entry.shelf_code} onClose={() => setAction(null)} />
      )}
      {action?.kind === "in" && (
        <MovementModal type="IN" initialItem={itemFields} onClose={() => setAction(null)} />
      )}
      {action?.kind === "edit" && (
        <EditEntryModal entry={action.entry} onClose={() => setAction(null)} />
      )}
    </>
  );
}
