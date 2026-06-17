# Settings + Access Controls — Design Spec (Phase 8)

Status: **approved** · Date: 2026-06-18 · Ports v0.1 `legacy/UM_Designs_StockHub.html`
Settings screen (`renderSettings`, `buildCSV`, `buildTransfersCSV`, `exportCSV`).

---

## 1. Goal

Port v0.1's Settings screen into v0.2, adapted for the multi-user Supabase model:
CSV exports, a shared edit-lock policy, a session-only manual-entry toggle, role-based
access control (no separate password), read-only data/master info, and a role-gated
per-entry unlock.

## 2. Decisions (locked)

| Decision | Choice |
|----------|--------|
| Access-control model | **Login roles** (`manager`/`admin`), via `useAuth().isManager`. **No manager password.** |
| Edit-lock window storage | **Shared in DB** (`app_settings` table); one policy for everyone. |
| Clear-All button | **Dropped.** Storage card → read-only **Data** stats. |
| Export scope | **CSV only** (entries CSV + transfers CSV). Photo-ZIP / JSZip **deferred** (no new dependency). |
| Per-entry unlock | **Included** — role-gated "Unlock" button on locked entries in the Edit modal. |
| Navigation | **6th ⚙️ Settings tab** in the bottom bar (matches v0.1). |

### 2.1 Superseded by this design
`0005_manager_password.sql` (the `profiles.manager_password_hash` column + `set_manager_password`/
`verify_manager_password` RPCs) was built to be "wired to Settings in Phase 8." The role-based
choice supersedes it. **Leave it in place, unused** — do not wire it, do not drop it (harmless,
and dropping it is unrelated churn). Noted here so a future reader knows it is intentionally dead.

## 3. Navigation & screen

- Route `/settings` already exists in `App.tsx` as a `Placeholder` — swap for `SettingsScreen`.
- Add a 6th tab to `src/components/TabBar.tsx`: `{ to: "/settings", label: "Settings", icon: "⚙️" }`
  (bottom bar grid already scales to `TABS.length`).
- `SettingsScreen` composes five cards top-to-bottom: **Exports → Access Controls → Data →
  Master Data → About**. Each card is a small co-located sub-component to keep the screen file
  focused (< 200 lines).

## 4. Cards

### 4.1 Exports
- Two buttons: **Export entries CSV**, **Export transfers CSV**.
- Available to any signed-in user (read-only data dump; matches v0.1's no-gate).
- Built client-side from React Query data already loaded: `useEntries()`, `useTransfers()`.
- Each writes a `Blob` with a UTF-8 BOM (`﻿`) so Excel reads Devanagari correctly, then
  triggers a download named `UM_StockHub_<Entries|Transfers>_<YYYY-MM-DD>.csv`.
- Empty-data guard: if there are no rows, toast `"Nothing to export"` (type `warn`) and skip.

CSV columns (port v0.1 exactly, mapped to v0.2 field names):

- **Entries** — Date, Zone Code, Zone Name, Shelf Code, Fixture Type, Master Code,
  Assigned Code, Match Status (`EXISTING`/`NEW`), Item Name, Definition, Category, Notes,
  Quantity, Scanned Barcode, Home Section. (v0.1's "Photo File" column is dropped — photos are
  URLs in Storage, not bundled; v0.2 adds "Home Section" from the enriched master.)
- **Transfers** — Date, STN Number, Item Code, Item Name, Definition, Category, From Zone,
  From Shelf, To Zone, To Shelf, Quantity, Source Deducted (`YES`/`NO`), Reason, Storekeeper, Helper.

### 4.2 Access Controls — **rendered only when `useAuth().isManager`**
- **Edit-Lock Window** `<select>` with options 1h / 6h / 12h / 24h / 48h / 7d
  (`EDIT_LOCK_OPTIONS_HOURS` already exists in `src/lib/editLock.ts`). Value read from
  `useAppSettings()`; change calls `useUpdateEditLockHours()` (role-gated) → toast on success.
- **Manual Entry Mode** toggle → `useSessionStore().setManualEntryMode`. Session-only,
  per-device, resets on reload (already wired via `resetSessionOverrides`). A status line shows
  `Manual entry: ON ⚠️ / OFF ✓ · Edit-lock: <n>h`.
- No password field anywhere.
- Storekeepers never see this card.

### 4.3 Data (read-only) — replaces v0.1 Storage+Clear-All
- Entries count, with-photos count (`entries.filter(e => e.photo_url)`), transfers count.
- No Clear-All. No browser-storage figure (irrelevant under Supabase).

### 4.4 Master Data (read-only, static)
- `4,561 items · 11 zones (Z01–Z11) · 6 categories · 13 sections`.
- Short note: master is re-seeded from the factory CSV (see CLAUDE.md §11.3).

### 4.5 About
- `U&M Designs · StockHub v0.2`, platform credit. Static.

## 5. Shared edit-lock policy — data flow

The edit-lock window must be one shared value, but existing consumers (`ItemsScreen`,
`EditEntryModal`) read `editLockHours` from the **session store** and pass it to the pure
`isEntryLocked()`. To change those consumers as little as possible:

1. `useAppSettings()` (React Query, key `["app_settings"]`) reads the single `app_settings`
   row → `{ editLockHours }`.
2. `useEditLockPolicy()` is called **once in `AppShell`**; on data arrival it calls
   `useSessionStore().setEditLockHours(value)`. So the session store stays the single read
   surface and **Items/Edit need no change**.
3. `useUpdateEditLockHours(hours)` (role-gated mutation) updates the row, invalidates
   `["app_settings"]`; the sync in `AppShell` then propagates the new value. Other devices
   pick it up on their next load/refetch (acceptable; not real-time).

The manual-entry and per-entry-unlock overrides stay session-only in the store and are **never
synced** (CLAUDE.md §5.3 / §11.4). Only the *policy* (window length) is shared.

## 6. Per-entry unlock (Edit modal)

- In `EditEntryModal`, when `isEntryLocked(entry, …)` is true **and** `useAuth().isManager`,
  render an **"🔓 Unlock"** button. Clicking calls `useSessionStore().unlockEntry(entry.id)`
  (already implemented), which removes the lock for this entry **this session, this device only**.
- Storekeepers see the existing locked message with no unlock affordance.
- No password prompt (removed by the role-based model).

## 7. Database — migration `0009_app_settings.sql` (user runs it)

```sql
-- Shared application settings (single row). Phase 8.
create table app_settings (
  id              smallint primary key default 1 check (id = 1),
  edit_lock_hours int not null default 24 check (edit_lock_hours in (1,6,12,24,48,168)),
  updated_at      timestamptz not null default now(),
  updated_by      uuid references profiles(id)
);
insert into app_settings (id, edit_lock_hours) values (1, 24) on conflict do nothing;

alter table app_settings enable row level security;
create policy "App settings readable" on app_settings
  for select using (auth.role() = 'authenticated');
create policy "App settings manager-write" on app_settings
  for update using (current_user_role() in ('manager','admin'))
  with check (current_user_role() in ('manager','admin'));
```

- Single-row table (`id = 1` enforced) — typed column, not key/value, since there's one setting.
- Reuses the existing `current_user_role()` helper (migration 0001).
- After running: regenerate `src/types/database.ts`.

## 8. Files

| File | Responsibility |
|------|----------------|
| `supabase/migrations/0009_app_settings.sql` | New table + RLS *(user runs)* |
| `src/types/database.ts` | Regenerated *(user runs gen)* |
| `src/lib/csv.ts` (+ `csv.test.ts`) | `csvSafe`, `buildEntriesCsv`, `buildTransfersCsv`, `downloadCsv` |
| `src/hooks/useAppSettings.ts` | Read the `app_settings` row → `{ editLockHours }` |
| `src/hooks/useUpdateEditLockHours.ts` | Role-gated mutation to update the window |
| `src/hooks/useEditLockPolicy.ts` | Sync DB value → session store (called in `AppShell`) |
| `src/screens/Settings/SettingsScreen.tsx` | Compose cards |
| `src/screens/Settings/` card sub-components | `ExportsCard`, `AccessControlsCard`, `DataCard`, `MasterDataCard`, `AboutCard` |
| `src/components/TabBar.tsx` | Add ⚙️ Settings tab |
| `src/components/AppShell.tsx` | Call `useEditLockPolicy()` once |
| `src/App.tsx` | Swap `/settings` placeholder → `SettingsScreen` |
| `src/screens/Items/EditEntryModal.tsx` | Role-gated Unlock button |

## 9. Testing

- **`csv.test.ts`** (Vitest, pure): `csvSafe` quotes values containing `" , \n \r` and doubles
  embedded quotes; `buildEntriesCsv` / `buildTransfersCsv` emit the exact header row and one row
  per record with correct field order and Match-Status / Source-Deducted mapping; empty input → header only.
- Hooks, screen, AppShell sync, and the Unlock button: verified by `tsc --noEmit`, `npm run build`,
  and manual parity against v0.1 (open both, compare a CSV export and the edit-lock behavior).

## 10. Out of scope (explicitly deferred)

- Photo-ZIP export + JSZip dependency (later phase, on demand).
- Real-time propagation of the edit-lock change (refetch-on-load is sufficient).
- Dropping the now-dead `manager_password` RPCs/column from 0005 (leave as-is).
- Real zone names (separate pinned task).
