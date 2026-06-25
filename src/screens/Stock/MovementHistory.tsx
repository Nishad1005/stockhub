import { useMemo, useState } from "react";
import { useMovements } from "@/hooks/useMovements";
import { MovementDetailModal } from "./MovementDetailModal";
import type { MovementRow } from "@/types/movement";
import { Badge } from "@/components/ui/Badge";
import { AlertTriangle } from "@/components/ui/icons";

function isDiscrepancy(m: MovementRow): boolean {
  return m.type === "OUT" && m.available_qty != null && m.qty > m.available_qty;
}

export function MovementHistory() {
  const { data: movements = [], isLoading } = useMovements();
  const [onlyDiscrepancies, setOnlyDiscrepancies] = useState(false);
  const [detail, setDetail] = useState<MovementRow | null>(null);

  const rows = useMemo(
    () => (onlyDiscrepancies ? movements.filter(isDiscrepancy) : movements),
    [movements, onlyDiscrepancies],
  );

  return (
    <div>
      <label className="flex items-center gap-2 text-xs text-brand-mute mb-2">
        <input type="checkbox" checked={onlyDiscrepancies} onChange={(e) => setOnlyDiscrepancies(e.target.checked)} />
        Discrepancies only
      </label>

      {isLoading && <p className="text-sm text-brand-mute p-3 text-center">Loading…</p>}
      {!isLoading && rows.length === 0 && <p className="text-sm text-brand-mute p-6 text-center">No movements.</p>}

      <ul className="divide-y divide-brand-line">
        {rows.map((m) => (
          <li key={m.id}>
            <button onClick={() => setDetail(m)} className="w-full text-left p-2 flex items-center gap-3">
              <Badge tone={m.type === "IN" ? "ok" : "bad"} className="shrink-0">
                {m.type}
              </Badge>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-brand-ink truncate">
                  {m.item_name}
                  {isDiscrepancy(m) && (
                    <AlertTriangle className="w-3 h-3 inline ml-1 text-brand-bad" />
                  )}
                </div>
                <div className="text-xs text-brand-mute truncate">
                  <span className="font-mono">{m.shelf_code}</span> · {m.ref_number} · {new Date(m.created_at).toLocaleDateString()}
                </div>
              </div>
              <span className="font-mono font-bold text-brand-ink shrink-0">{m.qty}</span>
            </button>
          </li>
        ))}
      </ul>

      {detail && <MovementDetailModal movement={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
