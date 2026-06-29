import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useOpenGrns } from "@/hooks/useOpenGrns";
import { OpenGrnRow } from "@/screens/Grn/OpenGrnRow";

const MAX_ROWS = 5;

/** Dashboard tile: DRAFT GRNs awaiting verification, oldest first (max 5). */
export function OpenGrnsTile() {
  const navigate = useNavigate();
  const { data: grns = [], isLoading } = useOpenGrns();
  const shown = grns.slice(0, MAX_ROWS);
  const moreCount = grns.length - shown.length;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold uppercase tracking-wide text-brand-mute">Open GRNs</h2>
        {!isLoading && grns.length > 0 && <Badge tone="neutral">{grns.length} waiting</Badge>}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-xl border border-brand-line p-3 animate-pulse">
              <div className="h-4 w-28 bg-brand-accent-soft rounded mb-2" />
              <div className="h-3 w-40 bg-brand-accent-soft rounded" />
            </div>
          ))}
        </div>
      ) : grns.length === 0 ? (
        <p className="text-sm text-brand-mute">No open GRNs.</p>
      ) : (
        <div className="space-y-2">
          {shown.map((g) => (
            <OpenGrnRow key={g.grnId} grn={g} />
          ))}
          {moreCount > 0 && (
            <button
              type="button"
              onClick={() => navigate("/grn")}
              className="w-full text-sm font-semibold text-brand-accent-2 py-1"
            >
              + {moreCount} more
            </button>
          )}
        </div>
      )}
    </Card>
  );
}
