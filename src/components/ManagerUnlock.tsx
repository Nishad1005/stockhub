import { useState, type FormEvent } from "react";
import { verifyManagerPassword } from "@/lib/managerPassword";
import { useSessionStore } from "@/stores/session";
import { toast } from "@/stores/toast";
import { errMessage } from "@/lib/errors";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";

export interface ManagerUnlockProps {
  open: boolean;
  onClose: () => void;
  /** Shown in the prompt, e.g. "enable manual entry". */
  reason?: string;
  /** Called after a correct password (defaults to enabling manual-entry mode). */
  onUnlocked?: () => void;
}

const FORM_ID = "manager-unlock-form";

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

  const footer = (
    <>
      <Button type="button" variant="secondary" fullWidth onClick={onClose}>Cancel</Button>
      <Button type="submit" form={FORM_ID} variant="primary" fullWidth loading={busy}>
        {busy ? "Checking…" : "Unlock"}
      </Button>
    </>
  );

  return (
    <Modal title="Manager password" onClose={onClose} footer={footer}>
      <form id={FORM_ID} onSubmit={submit} className="space-y-3">
        <p className="text-xs text-brand-mute">Required to {reason}.</p>
        <Input
          type="password"
          autoFocus
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
      </form>
    </Modal>
  );
}
