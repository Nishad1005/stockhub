import { useState, type FormEvent } from "react";
import { verifyManagerPassword } from "@/lib/managerPassword";
import { useSessionStore } from "@/stores/session";
import { toast } from "@/stores/toast";
import { errMessage } from "@/lib/errors";

export interface ManagerUnlockProps {
  open: boolean;
  onClose: () => void;
  /** Shown in the prompt, e.g. "enable manual entry". */
  reason?: string;
  /** Called after a correct password (defaults to enabling manual-entry mode). */
  onUnlocked?: () => void;
}

/**
 * Manager-password gate (v0.1 promptManagerPassword, but a proper modal — never
 * use browser prompt/alert). Verifies via the verify_manager_password RPC.
 */
export function ManagerUnlock({ open, onClose, reason = "enable manual entry", onUnlocked }: ManagerUnlockProps) {
  const setManualEntryMode = useSessionStore((s) => s.setManualEntryMode);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const ok = await verifyManagerPassword(pw);
      if (!ok) {
        toast("Wrong manager password (or none set for your account)", "err");
        return;
      }
      if (onUnlocked) onUnlocked();
      else setManualEntryMode(true);
      toast("Manual entry enabled for this session", "ok");
      onClose();
    } catch (err) {
      toast("Verify failed: " + errMessage(err), "err");
    } finally {
      setBusy(false);
      setPw("");
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl p-5 w-full max-w-xs space-y-3"
      >
        <h2 className="font-bold text-brand-ink">Manager password</h2>
        <p className="text-xs text-brand-mute">Required to {reason}.</p>
        <input
          type="password"
          autoFocus
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          className="w-full rounded-lg border border-brand-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-brand-line py-2 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex-1 rounded-lg bg-brand-accent-2 text-white py-2 text-sm font-semibold disabled:opacity-60"
          >
            {busy ? "Checking…" : "Unlock"}
          </button>
        </div>
      </form>
    </div>
  );
}
