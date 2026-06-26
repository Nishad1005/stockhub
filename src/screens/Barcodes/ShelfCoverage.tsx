import { useMemo } from "react";
import { useShelves } from "@/hooks/useShelves";
import { shelvesCoverage } from "@/lib/shelvesCoverage";

/** Read-only: shows how many shelves are registered per zone (admin confidence check). */
export function ShelfCoverage() {
  const { data, isLoading } = useShelves();
  const cov = useMemo(() => shelvesCoverage(data ?? []), [data]);

  return (
    <section className="bg-white border border-brand-line rounded-xl p-4">
      <h2 className="text-xs font-bold uppercase tracking-wide text-brand-mute mb-2">
        Registered shelves
      </h2>

      {isLoading ? (
        <p className="text-sm text-brand-mute">Checking…</p>
      ) : cov.total === 0 ? (
        <p className="text-sm text-brand-warn">
          ⚠ No shelves registered yet. An admin must apply migration 0014
          (<span className="font-mono">supabase db push</span>) so scanned labels show as known.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {cov.zones.map((z) => (
              <span
                key={z.zoneCode}
                className="text-xs font-mono px-2 py-1 rounded-lg bg-brand-accent-soft/50 text-brand-ink"
              >
                {z.zoneCode} <span className="text-brand-ok font-bold">✓ {z.count}</span>
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-brand-mute">{cov.total} shelves registered (Z01–Z06).</p>
        </>
      )}
    </section>
  );
}
