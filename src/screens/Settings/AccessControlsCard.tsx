import { useAppSettings } from "@/hooks/useAppSettings";
import { useUpdateEditLockHours } from "@/hooks/useUpdateEditLockHours";
import { useSessionStore } from "@/stores/session";
import { EDIT_LOCK_OPTIONS_HOURS } from "@/lib/editLock";
import { toast } from "@/stores/toast";
import { errMessage } from "@/lib/errors";
import { Card } from "./Card";

const LOCK_LABEL: Record<number, string> = {
  1: "1 hour", 6: "6 hours", 12: "12 hours", 24: "24 hours (default)", 48: "48 hours", 168: "7 days",
};

export function AccessControlsCard() {
  const { data: settings } = useAppSettings();
  const update = useUpdateEditLockHours();
  const manualEntryMode = useSessionStore((s) => s.manualEntryMode);
  const setManualEntryMode = useSessionStore((s) => s.setManualEntryMode);
  const editLockHours = settings?.editLockHours ?? 24;

  async function onChangeLock(hours: number) {
    try {
      await update.mutateAsync(hours);
      toast(`Edit-lock set to ${hours}h`, "ok");
    } catch (e) {
      toast("Couldn't update: " + errMessage(e), "err");
    }
  }

  return (
    <Card title="🔐 Access Controls">
      <div className="text-[11px] font-mono text-brand-mute mb-3">
        Manual entry: {manualEntryMode ? "ON ⚠️" : "OFF ✓"} · Edit-lock: {editLockHours}h
      </div>

      <label className="block text-xs font-semibold text-brand-mute mb-1">Edit-Lock Window</label>
      <select
        value={editLockHours}
        disabled={update.isPending}
        onChange={(e) => onChangeLock(parseInt(e.target.value, 10))}
        className="w-full rounded-lg border border-brand-line px-3 py-2 text-sm disabled:opacity-60"
      >
        {EDIT_LOCK_OPTIONS_HOURS.map((h) => (
          <option key={h} value={h}>{LOCK_LABEL[h]}</option>
        ))}
      </select>
      <p className="text-[11px] text-brand-mute mt-1 mb-4">
        Entries lock for editing this many hours after capture.
      </p>

      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-brand-ink">Manual Entry Mode</div>
          <div className="text-[11px] text-brand-mute">Type zone/shelf instead of scanning. Session-only.</div>
        </div>
        <button
          onClick={() => setManualEntryMode(!manualEntryMode)}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
            manualEntryMode ? "bg-brand-bad text-white" : "border border-brand-line text-brand-ink"
          }`}
        >
          {manualEntryMode ? "ON" : "OFF"}
        </button>
      </div>
    </Card>
  );
}
