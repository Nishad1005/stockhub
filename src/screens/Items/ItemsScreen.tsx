import { useMemo, useState } from "react";
import { ZONE_INDEX } from "@/constants/zones";
import { useEntries } from "@/hooks/useEntries";
import { useSessionStore } from "@/stores/session";
import { filterEntries, entryCounts, type EntryStatusFilter } from "@/lib/entryFilters";
import { isEntryLocked } from "@/lib/editLock";
import type { EntryRow } from "@/types/entry";
import { EditEntryModal } from "./EditEntryModal";

export function ItemsScreen() {
  const { data: entries = [], isLoading, error } = useEntries();
  const [zone, setZone] = useState("all");
  const [status, setStatus] = useState<EntryStatusFilter>("all");
  const [editing, setEditing] = useState<EntryRow | null>(null);

  const editLockHours = useSessionStore((s) => s.editLockHours);
  const manualEntryMode = useSessionStore((s) => s.manualEntryMode);
  const unlockedEntryIds = useSessionStore((s) => s.unlockedEntryIds);

  const counts = useMemo(() => entryCounts(entries), [entries]);
  const filtered = useMemo(() => filterEntries(entries, { zone, status }), [entries, zone, status]);
  const rows = useMemo(() => [...filtered].reverse(), [filtered]); // newest first (v0.1)

  const zonesPresent = Object.keys(counts.byZone).sort();

  const chip = (active: boolean) =>
    `px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${
      active ? "bg-brand-accent-2 text-white border-brand-accent-2" : "bg-white text-brand-ink border-brand-line"
    }`;

  return (
    <div className="min-h-screen bg-brand-cream text-brand-ink">
      <header className="px-4 pt-5 pb-2">
        <div className="text-xs font-bold uppercase tracking-widest text-brand-mute">U&amp;M StockHub</div>
        <h1 className="text-xl font-bold">Items</h1>
        <p className="text-sm text-brand-mute">{filtered.length} of {entries.length} items</p>
      </header>

      {/* Filters */}
      <div className="px-4 space-y-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button className={chip(status === "all")} onClick={() => setStatus("all")}>All {counts.total}</button>
          <button className={chip(status === "new")} onClick={() => setStatus("new")}>NEW {counts.newItems}</button>
          <button className={chip(status === "existing")} onClick={() => setStatus("existing")}>Existing {counts.existing}</button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button className={chip(zone === "all")} onClick={() => setZone("all")}>All Zones</button>
          {zonesPresent.map((z) => (
            <button key={z} className={chip(zone === z)} onClick={() => setZone(z)}>
              {z} {counts.byZone[z]}
            </button>
          ))}
        </div>
      </div>

      <main className="px-4 pb-24 pt-2 max-w-md mx-auto">
        {isLoading && <p className="text-sm text-brand-mute mt-8 text-center">Loading…</p>}
        {error && <p className="text-sm text-brand-bad mt-8 text-center">Failed to load items.</p>}
        {!isLoading && !error && rows.length === 0 && (
          <p className="text-sm text-brand-mute mt-12 text-center">📦 No items match the current filter.</p>
        )}

        <ul className="space-y-2">
          {rows.map((e) => {
            const locked = isEntryLocked(e, { editLockHours, manualEntryMode, unlockedEntryIds });
            const code = e.master_code ?? e.assigned_code;
            const tags = [e.defn, e.category].filter(Boolean).join(" · ");
            return (
              <li key={e.id}>
                <button
                  onClick={() => setEditing(e)}
                  className="w-full text-left bg-white border border-brand-line rounded-xl p-3 flex gap-3 items-center"
                >
                  {e.photo_url ? (
                    <img src={e.photo_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-brand-accent-soft flex items-center justify-center shrink-0">📦</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-brand-ink truncate">
                      <span
                        className={`mr-1.5 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          code ? "bg-brand-ok/15 text-brand-ok" : "bg-brand-warn/15 text-brand-warn"
                        }`}
                      >
                        {code ?? "NEW"}
                      </span>
                      {e.name}
                      {locked && <span className="ml-1" title="Locked">🔒</span>}
                    </div>
                    <div className="text-xs text-brand-mute truncate">
                      <span className="font-mono">{e.shelf_code}</span>
                      {" · "}
                      {ZONE_INDEX[e.zone_code]?.code ?? e.zone_code}
                      {tags ? " · " + tags : ""}
                    </div>
                  </div>
                  <div className={`text-sm font-semibold shrink-0 ${e.qty != null ? "text-brand-ink" : "text-brand-mute"}`}>
                    {e.qty != null ? e.qty : "—"}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </main>

      {editing && <EditEntryModal entry={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
