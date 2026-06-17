import { useMemo } from "react";
import { useEntries } from "@/hooks/useEntries";
import { rollUpStock } from "@/lib/stockLevels";

export function StockLevels() {
  const { data: entries = [], isLoading } = useEntries();
  const items = useMemo(() => rollUpStock(entries), [entries]);

  if (isLoading) return <p className="text-sm text-brand-mute p-3 text-center">Loading…</p>;
  if (items.length === 0) return <p className="text-sm text-brand-mute p-6 text-center">No stock recorded yet.</p>;

  return (
    <ul className="divide-y divide-brand-line">
      {items.map((it) => (
        <li key={(it.code ?? it.name) + it.name} className="py-2">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-sm font-medium text-brand-ink truncate">
                {it.code && <span className="mr-1 text-[10px] font-mono font-bold px-1 py-0.5 rounded bg-brand-ok/15 text-brand-ok">{it.code}</span>}
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
          </div>
        </li>
      ))}
    </ul>
  );
}
