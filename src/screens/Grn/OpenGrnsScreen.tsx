import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useOpenGrns } from "@/hooks/useOpenGrns";
import { OpenGrnRow } from "./OpenGrnRow";

/** Full Open GRNs list (route /grn) — same rows as the dashboard tile, no 5-row cap. */
export function OpenGrnsScreen() {
  const { data: grns = [], isLoading } = useOpenGrns();

  return (
    <div className="min-h-screen bg-brand-cream text-brand-ink">
      <ScreenHeader
        title="Open GRNs"
        subtitle={isLoading ? undefined : `${grns.length} waiting verification`}
      />
      <main className="px-4 pb-24 max-w-md mx-auto space-y-2">
        {isLoading ? (
          <p className="text-sm text-brand-mute">Loading…</p>
        ) : grns.length === 0 ? (
          <p className="text-sm text-brand-mute">No open GRNs.</p>
        ) : (
          grns.map((g) => <OpenGrnRow key={g.grnId} grn={g} />)
        )}
      </main>
    </div>
  );
}
