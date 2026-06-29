import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { ChevronRight } from "@/components/ui/icons";
import { formatWaitingTime, waitingTone } from "@/lib/grn";
import type { OpenGrn } from "@/hooks/useOpenGrns";

/** One open-GRN row — shared by the dashboard tile and the full Open GRNs screen. */
export function OpenGrnRow({ grn }: { grn: OpenGrn }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(`/grn/${grn.grnId}/verify`)}
      className="w-full text-left rounded-xl border border-brand-line p-3 flex items-start gap-2"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-sm font-bold text-brand-ink truncate">{grn.grnNumber}</span>
          <Badge tone={waitingTone(grn.waitingMinutes)} className="shrink-0">
            Waiting {formatWaitingTime(grn.waitingMinutes)}
          </Badge>
        </div>
        <div className="text-sm text-brand-ink mt-1 truncate">
          {grn.vehicleNumber ?? "—"}
          {grn.driverName ? ` · ${grn.driverName}` : ""}
        </div>
        <div className="text-sm text-brand-mute truncate">{grn.supplierName}</div>
      </div>
      <ChevronRight className="w-4 h-4 text-brand-mute mt-0.5 shrink-0" />
    </button>
  );
}
