import { useState } from "react";
import { ZONES } from "@/constants/zones";
import { useUpdateEntry } from "@/hooks/useUpdateEntry";
import { useDeleteEntry } from "@/hooks/useDeleteEntry";
import { useSessionStore } from "@/stores/session";
import { isEntryLocked, entryAgeHours } from "@/lib/editLock";
import { toast } from "@/stores/toast";
import { errMessage } from "@/lib/errors";
import { usePermissions } from "@/hooks/usePermissions";
import type { EntryRow } from "@/types/entry";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { Lock } from "@/components/ui/icons";

export interface EditEntryModalProps {
  entry: EntryRow;
  onClose: () => void;
}

/** Edit / delete a captured entry — ports v0.1 openEditModal + saveEditModal. */
export function EditEntryModal({ entry, onClose }: EditEntryModalProps) {
  const update = useUpdateEntry();
  const del = useDeleteEntry();
  const { can } = usePermissions();

  const editLockHours = useSessionStore((s) => s.editLockHours);
  const manualEntryMode = useSessionStore((s) => s.manualEntryMode);
  const unlockedEntryIds = useSessionStore((s) => s.unlockedEntryIds);
  const unlockEntry = useSessionStore((s) => s.unlockEntry);

  const [name, setName] = useState(entry.name);
  const [zoneCode, setZoneCode] = useState(entry.zone_code);
  const [shelfCode, setShelfCode] = useState(entry.shelf_code);
  const [qty, setQty] = useState(entry.qty != null ? String(entry.qty) : "");
  const [defn, setDefn] = useState(entry.defn ?? "");
  const [category, setCategory] = useState(entry.category ?? "");
  const [notes, setNotes] = useState(entry.notes ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const locked = isEntryLocked(entry, { editLockHours, manualEntryMode, unlockedEntryIds });
  const ageHrs = Math.floor(entryAgeHours(entry.created_at));
  const disabled = locked || !can("edit_entry");

  async function save() {
    if (locked) {
      toast("Entry is locked — unlock it first", "warn");
      return;
    }
    try {
      await update.mutateAsync({
        id: entry.id,
        patch: { name, zoneCode, shelfCode, qty, defn, category, notes },
      });
      toast("Entry updated", "ok");
      onClose();
    } catch (e) {
      toast("Update failed: " + errMessage(e), "err");
    }
  }

  async function remove() {
    try {
      await del.mutateAsync(entry.id);
      toast("Entry deleted", "ok");
      onClose();
    } catch (e) {
      toast("Delete failed: " + errMessage(e), "err");
    }
  }

  const selectClasses =
    "w-full rounded-xl border border-brand-line px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-accent-2/30 focus:border-brand-accent-2 disabled:bg-brand-cream";

  const footer = confirmDelete ? (
    <>
      <Button variant="secondary" fullWidth onClick={() => setConfirmDelete(false)}>Cancel</Button>
      <Button variant="danger" fullWidth loading={del.isPending} onClick={remove}>
        {del.isPending ? "Deleting…" : "Confirm delete"}
      </Button>
    </>
  ) : (
    <>
      {can("delete_entry") && (
        <Button variant="danger" onClick={() => setConfirmDelete(true)}>Delete</Button>
      )}
      <Button variant="primary" fullWidth disabled={disabled} loading={update.isPending} onClick={save}>
        {update.isPending ? "Saving…" : "Save changes"}
      </Button>
    </>
  );

  return (
    <Modal title="Edit entry" onClose={onClose} footer={footer}>
      {locked && (
        <div className="mb-3 rounded-lg border-l-4 border-brand-bad bg-brand-cream p-3 text-xs text-brand-bad">
          <div className="flex items-center gap-1.5 mb-1">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <b>Locked</b> — captured {ageHrs}h ago, beyond the {editLockHours}h edit window.
          </div>
          {can("unlock_entry") ? (
            <button
              onClick={() => {
                unlockEntry(entry.id);
                toast("Unlocked for this session", "ok");
              }}
              className="mt-2 w-full rounded-lg border border-brand-bad py-1.5 font-semibold"
            >
              Unlock
            </button>
          ) : (
            <div className="mt-1">A manager can unlock this entry.</div>
          )}
        </div>
      )}

      {entry.photo_url && (
        <img src={entry.photo_url} alt="" className="w-full max-h-48 object-cover rounded-lg mb-3" />
      )}

      <div className="space-y-3">
        <div>
          <Label>Item name</Label>
          <Input value={name} disabled={disabled} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <Label>Zone</Label>
            <select value={zoneCode} disabled={disabled} onChange={(e) => setZoneCode(e.target.value)} className={selectClasses}>
              {ZONES.map((z) => (
                <option key={z.code} value={z.code}>{z.code}</option>
              ))}
            </select>
          </div>
          <div className="w-28">
            <Label>Qty</Label>
            <Input type="number" min={0} value={qty} disabled={disabled} onChange={(e) => setQty(e.target.value)} placeholder="—" />
          </div>
        </div>

        <div>
          <Label>Shelf / Fixture</Label>
          <Input
            mono
            value={shelfCode}
            disabled={disabled}
            onChange={(e) => setShelfCode(e.target.value.toUpperCase())}
          />
        </div>

        <div>
          <Label>Definition</Label>
          <Input value={defn} disabled={disabled} onChange={(e) => setDefn(e.target.value)} />
        </div>
        <div>
          <Label>Category</Label>
          <Input value={category} disabled={disabled} onChange={(e) => setCategory(e.target.value)} />
        </div>
        <div>
          <Label>Notes</Label>
          <Input value={notes} disabled={disabled} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="text-[11px] text-brand-mute">
          {entry.master_code ? <>Master code: <b>{entry.master_code}</b></> : "No master match (NEW item)"}
        </div>
      </div>
    </Modal>
  );
}
