import { useMemo, useState } from "react";
import { useEntries } from "@/hooks/useEntries";
import { useMovements } from "@/hooks/useMovements";
import { useTransfers } from "@/hooks/useTransfers";
import { itemLocations, itemActivity, type ItemSelector } from "@/lib/itemDetail";
import { usePermissions } from "@/hooks/usePermissions";
import { ZONE_INDEX } from "@/constants/zones";
import { NewTransferModal } from "@/screens/Transfers/NewTransferModal";
import { MovementModal } from "@/screens/Stock/MovementModal";
import { EditEntryModal } from "@/screens/Items/EditEntryModal";
import type { EntryRow } from "@/types/entry";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

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
  const { can } = usePermissions();

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

  const titleNode = (
    <div className="min-w-0">
      <div className="text-sm font-bold text-brand-ink truncate">
        <Badge tone={code ? "ok" : "warn"} className="mr-1.5">{code ?? "NEW"}</Badge>
        {name}
      </div>
      {(defn || category) && <div className="text-xs text-brand-mute font-normal">{[defn, category].filter(Boolean).join(" · ")}</div>}
    </div>
  );

  return (
    <>
      <Modal title={titleNode} onClose={onClose}>
        <div className="flex items-center justify-between mt-2 mb-3">
          <div className="text-xs text-brand-mute">Total on hand: <span className="font-mono font-bold text-brand-ink">{total}</span></div>
          {can("stock_in") && (
            <Button size="sm" variant="primary" onClick={() => setAction({ kind: "in" })}>
              Stock IN
            </Button>
          )}
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
                {can("transfer") && <button onClick={() => setAction({ kind: "transfer", entry: e })} className={actBtn}>Move</button>}
                {can("stock_out") && <button onClick={() => setAction({ kind: "out", entry: e })} className={actBtn}>Out</button>}
                {can("edit_entry") && <button onClick={() => setAction({ kind: "edit", entry: e })} className={actBtn}>Edit</button>}
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
                <Badge
                  tone={a.kind === "IN" ? "ok" : a.kind === "OUT" ? "bad" : "neutral"}
                  className="shrink-0"
                >
                  {a.kind === "TRANSFER" ? "MOVE" : a.kind}
                </Badge>
                <span className="font-mono text-brand-mute shrink-0">{a.ref.split("/").pop()}</span>
                <span className="text-brand-ink truncate">{a.summary}</span>
                <span className="text-brand-mute ml-auto shrink-0">{new Date(a.when).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
      </Modal>

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
