import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useTodayGateEntries } from "@/hooks/useTodayGateEntries";

// No blue/info tone in the design system — VERIFIED maps to `warn` (distinct from DRAFT).
const STATUS_TONE: Record<string, BadgeTone> = {
  DRAFT: "neutral",
  VERIFIED: "warn",
  COMPLETED: "ok",
  REJECTED: "bad",
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** Today's gate entries for the signed-in security user. */
export function GateEntriesList() {
  const { data: entries = [], isLoading, error } = useTodayGateEntries();

  if (isLoading) return <p className="text-sm text-brand-mute text-center py-6">Loading…</p>;
  if (error) return <p className="text-sm text-brand-bad text-center py-6">Couldn't load today's entries.</p>;
  if (entries.length === 0) {
    return (
      <p className="text-sm text-brand-mute text-center py-8">
        No gate entries yet today. Tap above to log a vehicle.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {entries.map((e) => (
        <li key={e.grnId}>
          <Card className="p-3">
            <div className="flex items-start justify-between gap-2">
              <span className="font-mono text-sm font-bold text-brand-ink">{e.grnNumber}</span>
              <Badge tone={STATUS_TONE[e.status] ?? "neutral"}>{e.status}</Badge>
            </div>
            <div className="text-sm text-brand-ink mt-1">
              {e.vehicleNumber} · {e.driverName}
            </div>
            <div className="text-sm text-brand-mute">{e.supplierName}</div>
            <div className="text-xs text-brand-mute mt-1">{formatTime(e.createdAt)}</div>
          </Card>
        </li>
      ))}
    </ul>
  );
}
