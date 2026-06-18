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

  const field = "w-full rounded-lg border border-brand-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent disabled:bg-brand-cream";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-2xl p-5 max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-brand-ink">Edit entry</h2>
          <button onClick={onClose} className="text-brand-mute text-lg leading-none px-1">✕</button>
        </div>

        {locked && (
          <div className="mb-3 rounded-lg border-l-4 border-brand-bad bg-brand-cream p-3 text-xs text-brand-bad">
            🔒 <b>Locked</b> — captured {ageHrs}h ago, beyond the {editLockHours}h edit window.
            {can("unlock_entry") ? (
              <button
                onClick={() => {
                  unlockEntry(entry.id);
                  toast("Unlocked for this session", "ok");
                }}
                className="mt-2 w-full rounded-lg border border-brand-bad py-1.5 font-semibold"
              >
                🔓 Unlock
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
            <label className="block text-xs font-semibold text-brand-mute mb-1">Item name</label>
            <input value={name} disabled={disabled} onChange={(e) => setName(e.target.value)} className={field} />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-brand-mute mb-1">Zone</label>
              <select value={zoneCode} disabled={disabled} onChange={(e) => setZoneCode(e.target.value)} className={field}>
                {ZONES.map((z) => (
                  <option key={z.code} value={z.code}>{z.code}</option>
                ))}
              </select>
            </div>
            <div className="w-28">
              <label className="block text-xs font-semibold text-brand-mute mb-1">Qty</label>
              <input type="number" min={0} value={qty} disabled={disabled} onChange={(e) => setQty(e.target.value)} placeholder="—" className={field} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-brand-mute mb-1">Shelf / Fixture</label>
            <input
              value={shelfCode}
              disabled={disabled}
              onChange={(e) => setShelfCode(e.target.value.toUpperCase())}
              className={`${field} font-mono font-bold uppercase`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-brand-mute mb-1">Definition</label>
            <input value={defn} disabled={disabled} onChange={(e) => setDefn(e.target.value)} className={field} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-brand-mute mb-1">Category</label>
            <input value={category} disabled={disabled} onChange={(e) => setCategory(e.target.value)} className={field} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-brand-mute mb-1">Notes</label>
            <input value={notes} disabled={disabled} onChange={(e) => setNotes(e.target.value)} className={field} />
          </div>

          <div className="text-[11px] text-brand-mute">
            {entry.master_code ? <>Master code: <b>{entry.master_code}</b></> : "No master match (NEW item)"}
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          {confirmDelete ? (
            <>
              <button onClick={() => setConfirmDelete(false)} className="flex-1 rounded-lg border border-brand-line py-2 text-sm font-semibold">
                Cancel
              </button>
              <button onClick={remove} disabled={del.isPending} className="flex-1 rounded-lg bg-brand-bad text-white py-2 text-sm font-semibold disabled:opacity-60">
                {del.isPending ? "Deleting…" : "Confirm delete"}
              </button>
            </>
          ) : (
            <>
              {can("delete_entry") && (
                <button onClick={() => setConfirmDelete(true)} className="rounded-lg border border-brand-bad text-brand-bad px-4 py-2 text-sm font-semibold">
                  Delete
                </button>
              )}
              <button onClick={save} disabled={disabled || update.isPending} className="flex-1 rounded-lg bg-brand-accent-2 text-white py-2 text-sm font-semibold disabled:opacity-60">
                {update.isPending ? "Saving…" : "Save changes"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
