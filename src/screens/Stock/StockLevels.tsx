import { useMemo, useState } from "react";
import { useEntries } from "@/hooks/useEntries";
import { rollUpStock } from "@/lib/stockLevels";
import { ItemDetailModal } from "@/screens/ItemDetail/ItemDetailModal";
import type { ItemSelector } from "@/lib/itemDetail";
import { Badge } from "@/components/ui/Badge";

export function StockLevels() {
  const { data: entries = [], isLoading } = useEntries();
  const [detail, setDetail] = useState<ItemSelector | null>(null);
  const items = useMemo(() => rollUpStock(entries), [entries]);

  return (
    <>
      {isLoading ? (
        <p className="text-sm text-brand-mute p-3 text-center">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-brand-mute p-6 text-center">No stock recorded yet.</p>
      ) : (
        <ul className="divide-y divide-brand-line">
          {items.map((it) => (
            <li key={(it.code ?? it.name) + it.name} className="py-2">
              <button
                onClick={() => setDetail({ code: it.code, name: it.name })}
                className="w-full text-left flex items-center justify-between"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-brand-ink truncate">
                    {it.code && (
                      <Badge tone="ok" className="mr-1">
                        {it.code}
                      </Badge>
                    )}
                    {it.name}
                  </div>
                  <div className="text-[11px] text-brand-mute">
                    {it.byShelf.map((s) => (
                      <span key={s.shelf} className="mr-2">
                        <span className="font-mono">{s.shelf}</span>:{s.qty}
                        {s.qty === 0 && <span className="ml-0.5 text-brand-warn">empty</span>}
                      </span>
                    ))}
                  </div>
                </div>
                <div className={`font-mono font-bold shrink-0 ${it.total === 0 ? "text-brand-bad" : "text-brand-ink"}`}>
                  {it.total}
                  {it.total === 0 && <span className="block text-[9px] font-sans text-brand-bad">out of stock</span>}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      {detail && <ItemDetailModal selector={detail} onClose={() => setDetail(null)} />}
    </>
  );
}
