import { Button } from "@/components/ui/Button";
import { Check } from "@/components/ui/icons";

export interface GateConfirmationData {
  grnId: string;
  grnNumber: string;
  vehicleNumber: string;
  driverName: string;
  supplierName: string;
}

/** Full-screen success state shown right after a gate entry is recorded. */
export function GateConfirmation({
  data,
  onNext,
  onViewList,
}: {
  data: GateConfirmationData;
  onNext: () => void;
  onViewList: () => void;
}) {
  return (
    <div className="min-h-screen bg-brand-cream text-brand-ink flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-brand-ok/15 flex items-center justify-center mb-5">
        <Check className="w-8 h-8 text-brand-ok" />
      </div>

      <h1 className="text-xl font-extrabold mb-3">Gate entry recorded</h1>

      <div className="font-mono font-bold text-2xl text-brand-ink mb-5">{data.grnNumber}</div>

      <dl className="text-sm space-y-1 mb-8">
        <div>
          <span className="text-brand-mute">Vehicle: </span>
          <span className="font-semibold text-brand-ink">{data.vehicleNumber}</span>
        </div>
        <div>
          <span className="text-brand-mute">Driver: </span>
          <span className="font-semibold text-brand-ink">{data.driverName}</span>
        </div>
        <div>
          <span className="text-brand-mute">Supplier: </span>
          <span className="font-semibold text-brand-ink">{data.supplierName}</span>
        </div>
      </dl>

      <div className="w-full max-w-sm space-y-3">
        <Button fullWidth onClick={onNext}>Log next vehicle</Button>
        <button
          type="button"
          onClick={onViewList}
          className="w-full text-sm font-semibold text-brand-accent-2 py-2"
        >
          View today's entries
        </button>
      </div>
    </div>
  );
}
