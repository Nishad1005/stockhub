import { useMemo, useState } from "react";
import { ZONE_INDEX } from "@/constants/zones";
import { useEntries } from "@/hooks/useEntries";
import { useMovements } from "@/hooks/useMovements";
import { useAuth } from "@/hooks/useAuth";
import { emptyLocations, discrepancies } from "@/lib/stockLevels";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { entryCode } from "@/hooks/useAssignItemCode";
import { CameraScanner } from "@/components/CameraScanner";
import type { EntryRow } from "@/types/entry";

/**
 * Dashboard — the lookup surface. Primary feature: "Where is this item?" (scan
 * or type → which shelf(s) it's on). Plus per-zone counts, NEW vs existing,
 * fullest shelves, and recent activity. All derived from entries.
 */
export function DashboardScreen() {
  const { data: entries = [], isLoading } = useEntries();
  const { data: movements = [] } = useMovements();
  const { isManager } = useAuth();
  const empties = useMemo(() => emptyLocations(entries), [entries]);
  const discreps = useMemo(() => discrepancies(movements).slice(0, 8), [movements]);
  const [query, setQuery] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const q = useDebouncedValue(query.trim().toLowerCase(), 200);

  // ── Where is this item? — match captured entries by name / code ──
  const results = useMemo(() => {
    if (q.length < 2) return [];
    return entries.filter((e) => {
      const hay = `${e.name} ${e.master_code ?? ""} ${e.assigned_code ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [entries, q]);

  const byLocation = useMemo(() => {
    const m = new Map<string, EntryRow[]>();
    for (const e of results) {
      const loc = e.shelf_code || e.zone_code || "?";
      const arr = m.get(loc);
      if (arr) arr.push(e);
      else m.set(loc, [e]);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [results]);

  // ── Aggregates ──
  const stats = useMemo(() => {
    const byZone: Record<string, number> = {};
    const byShelf: Record<string, number> = {};
    let withMaster = 0;
    for (const e of entries) {
      byZone[e.zone_code] = (byZone[e.zone_code] || 0) + 1;
      if (e.shelf_code) byShelf[e.shelf_code] = (byShelf[e.shelf_code] || 0) + 1;
      if (e.master_code) withMaster++;
    }
    const shelves = Object.entries(byShelf).map(([shelf, count]) => ({ shelf, count }));
    return {
      byZone,
      shelvesUsed: shelves.length,
      withMaster,
      withoutMaster: entries.length - withMaster,
      topShelves: [...shelves].sort((a, b) => b.count - a.count).slice(0, 8),
    };
  }, [entries]);

  const recent = useMemo(
    () => [...entries].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 15),
    [entries],
  );

  const zoneRows = useMemo(() => {
    const max = Math.max(1, ...Object.values(stats.byZone));
    return Object.keys(ZONE_INDEX)
      .filter((z) => stats.byZone[z])
      .map((z) => ({
        code: z,
        name: ZONE_INDEX[z]?.name ?? z,
        count: stats.byZone[z],
        pct: Math.round((stats.byZone[z] / max) * 100),
      }));
  }, [stats]);

  const codeBadge = (e: EntryRow) => {
    const c = entryCode(e);
    return (
      <span
        className={`mr-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
          c ? "bg-brand-ok/15 text-brand-ok" : "bg-brand-warn/15 text-brand-warn"
        }`}
      >
        {c ?? "NEW"}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-brand-cream text-brand-ink">
      <header className="px-4 pt-5 pb-2">
        <div className="text-xs font-bold uppercase tracking-widest text-brand-mute">U&amp;M StockHub</div>
        <h1 className="text-xl font-bold">Dashboard</h1>
        <p className="text-sm text-brand-mute">
          {entries.length} entries · {stats.shelvesUsed} shelves used
        </p>
      </header>

      <main className="px-4 pb-24 max-w-md mx-auto space-y-4">
        {isManager && (empties.length > 0 || discreps.length > 0) && (
          <section className="bg-white border-2 border-brand-warn/50 rounded-xl p-4">
            <h2 className="text-xs font-bold uppercase tracking-wide text-brand-warn mb-2">⚠ Alerts</h2>
            {empties.length > 0 && (
              <div className="mb-3">
                <div className="text-[11px] font-bold text-brand-bad mb-1">Empty locations ({empties.length})</div>
                <ul className="text-sm space-y-0.5">
                  {empties.slice(0, 8).map((x) => (
                    <li key={x.shelf + x.name} className="truncate">
                      {x.name} · <span className="font-mono text-brand-mute">{x.shelf}</span> — <span className="text-brand-bad">empty</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {discreps.length > 0 && (
              <div>
                <div className="text-[11px] font-bold text-brand-bad mb-1">Recent discrepancies ({discreps.length})</div>
                <ul className="text-sm space-y-0.5">
                  {discreps.map((d) => (
                    <li key={d.id} className="truncate">
                      <span className="font-mono text-xs">{d.ref}</span> · {d.name} @ <span className="font-mono">{d.shelf}</span> — issued {d.requested}, only {d.available} on hand
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* Where is this item? */}
        <section className="bg-white border border-brand-line rounded-xl p-4">
          <h2 className="text-xs font-bold uppercase tracking-wide text-brand-mute mb-2">Where is this item?</h2>
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a name or code…"
              className="flex-1 rounded-lg border border-brand-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
            />
            <button
              type="button"
              onClick={() => setScanOpen(true)}
              className="rounded-lg bg-brand-accent-2 text-white font-semibold px-3 text-sm"
            >
              Scan
            </button>
          </div>

          {q.length >= 2 && (
            <div className="mt-3">
              {byLocation.length === 0 ? (
                <p className="text-sm text-brand-mute">No captured items match “{q}”.</p>
              ) : (
                <ul className="space-y-2">
                  {byLocation.map(([loc, items]) => (
                    <li key={loc} className="rounded-lg bg-brand-accent-soft/50 p-2">
                      <div className="font-mono font-bold text-sm text-brand-accent-2">
                        {loc}
                        <span className="ml-1 font-sans font-normal text-brand-mute">
                          · {ZONE_INDEX[items[0].zone_code]?.name ?? items[0].zone_code}
                        </span>
                      </div>
                      {items.map((e) => (
                        <div key={e.id} className="text-sm text-brand-ink truncate">
                          {codeBadge(e)}
                          {e.name}
                          {e.qty != null && <span className="text-brand-mute"> · qty {e.qty}</span>}
                        </div>
                      ))}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        {/* Items by zone */}
        <section className="bg-white border border-brand-line rounded-xl p-4">
          <h2 className="text-xs font-bold uppercase tracking-wide text-brand-mute mb-3">Items by zone</h2>
          {zoneRows.length === 0 ? (
            <p className="text-sm text-brand-mute">No items captured yet.</p>
          ) : (
            <div className="space-y-1.5">
              {zoneRows.map((r) => (
                <div key={r.code} className="flex items-center gap-2 text-xs">
                  <span className="w-9 font-mono font-bold">{r.code}</span>
                  <div className="flex-1 bg-brand-accent-soft rounded h-5 overflow-hidden">
                    <div className="h-full bg-brand-accent-2" style={{ width: `${r.pct}%` }} />
                  </div>
                  <span className="w-8 text-right font-semibold">{r.count}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* NEW vs existing */}
        <section className="bg-white border border-brand-line rounded-xl p-4">
          <h2 className="text-xs font-bold uppercase tracking-wide text-brand-mute mb-2">NEW vs existing</h2>
          <div className="flex gap-3">
            <div className="flex-1 rounded-lg bg-brand-ok/10 p-3 text-center">
              <div className="text-2xl font-bold text-brand-ok">{stats.withMaster}</div>
              <div className="text-xs text-brand-mute">Existing (master-matched)</div>
            </div>
            <div className="flex-1 rounded-lg bg-brand-warn/10 p-3 text-center">
              <div className="text-2xl font-bold text-brand-warn">{stats.withoutMaster}</div>
              <div className="text-xs text-brand-mute">NEW (need a code)</div>
            </div>
          </div>
        </section>

        {/* Fullest shelves */}
        {stats.topShelves.length > 0 && (
          <section className="bg-white border border-brand-line rounded-xl p-4">
            <h2 className="text-xs font-bold uppercase tracking-wide text-brand-mute mb-2">Fullest shelves</h2>
            <ul className="text-sm divide-y divide-brand-line">
              {stats.topShelves.map((s) => (
                <li key={s.shelf} className="flex justify-between py-1.5">
                  <span className="font-mono">{s.shelf}</span>
                  <span className="text-brand-mute">{s.count} item{s.count === 1 ? "" : "s"}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Recent captures */}
        <section className="bg-white border border-brand-line rounded-xl p-4">
          <h2 className="text-xs font-bold uppercase tracking-wide text-brand-mute mb-2">Recent captures</h2>
          {isLoading ? (
            <p className="text-sm text-brand-mute">Loading…</p>
          ) : recent.length === 0 ? (
            <p className="text-sm text-brand-mute">Nothing captured yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {recent.map((e) => (
                <li key={e.id} className="text-sm truncate">
                  {codeBadge(e)}
                  {e.name}
                  <span className="text-brand-mute"> · </span>
                  <span className="font-mono text-xs text-brand-mute">{e.shelf_code}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <CameraScanner
        open={scanOpen}
        title="Scan item to locate"
        onClose={() => setScanOpen(false)}
        onDetected={(decoded) => {
          setScanOpen(false);
          setQuery(decoded.trim());
        }}
      />
    </div>
  );
}
