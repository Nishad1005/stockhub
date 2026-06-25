# StockHub v0.2 — Actual Build Status (ground-truth audit)

Read-only audit of the deployed `main` branch, verified against source. Where this
disagrees with `PROJECT-OVERVIEW.md` / `Stockhub.docx`, the source wins.

Status legend:
- ✅ Live — code exists, is in the active route tree, the data path reaches Supabase, reachable from the UI.
- 🟡 Stub — code exists but is unreachable / dead route / dead import.
- ⚠️ Partial — only some of the claim is real.
- ❌ Not built — claimed in docs, no working code.

## Status summary

| # | Feature (as claimed) | Status |
|---|----------------------|--------|
| 1 | Auth — login / self-signup / pending gate | ✅ |
| 2 | Roles + 10 granular permissions (role_permissions, usePermissions) | ✅ |
| 3 | Capture screen (shell, sticky shelf, zone auto-derive) | ✅ |
| 4 | Camera scan (html5-qrcode) | ✅ |
| 5 | USB/Bluetooth scanner | ✅ |
| 6 | Manual-entry mode (manager toggle) | ✅ |
| 7 | Master typeahead | ✅ |
| 8 | Photo capture → Storage → entries.photo_url | ⚠️ |
| 9 | Items list (browse / filter / edit / delete) | ✅ |
| 10 | Edit-lock window | ✅ |
| 11 | Item Detail modal + one-tap actions | ✅ |
| 12 | Transfers + STN | ✅ |
| 13 | Stock IN/OUT + GRN/MIR + discrepancies | ✅ |
| 14 | Movements unified hub (`/movements` with toggle) | 🟡 |
| 15 | Find / Dashboard (locate + aggregates) | ✅ |
| 16 | Alerts panel (empty locations + discrepancies) | ✅ |
| 17 | Barcodes: ITM codes + item labels + shelf reprint | ✅ |
| 18 | 612-shelf registry + "unregistered shelf" warning | ✅ |
| 19 | Settings content (exports, access controls, data, account, team) | ✅ |
| 20 | 5-tab "More" navigation (`/more`, `/movements` routes, Tools card) | 🟡 |
| 21 | Users admin (pending approvals, role mgmt, permission matrix) | ✅ |
| 22 | ManagerUnlock component / manager_password (migration 0005) | 🟡 |
| 23 | Native iOS / Android (Capacitor) | ❌ |
| 24 | Offline-first (SQLite mirror) | ❌ |

Counts: ✅ 18 · 🟡 3 · ⚠️ 1 · ❌ 2

---

## 1. Repo + branch state

- Current branch: `main`.
- HEAD: `bc83f6f` — "Merge fix: Stock OUT button visibility" — 2026-06-26 02:39 +0530.
- `origin/main` HEAD: `bc83f6f` (identical). Netlify deploys `main`, so the **last deployed commit is `bc83f6f`**.
- `feat/nav-redesign` is **NOT merged**. It is 3 commits ahead of `main` and 0 behind:
  - `911ebcd` feat(nav): consolidate 7 tabs into 5 (Movements hub + More)
  - `8bbc831` docs: navigation redesign handoff/explainer
  - `3f7f293` docs: whole-project overview (scope, features, data model, status)
  - Consequence: **`PROJECT-OVERVIEW.md` itself only exists on `feat/nav-redesign`**, not on `main` and not on disk. The doc this audit checks against is not part of the deployed code.
- Uncommitted in the working tree (not on any branch):
  - `package.json`, `package-lock.json` — modified: adds `"shadcn": "^4.11.0"` to devDependencies (the shadcn MCP install). Not committed.
  - `.mcp.json` — untracked: config for the `shadcn` MCP server. Not committed.
  - These are tooling changes only; they do not affect shipped app features.
- Stashes: none.

---

## 2. Screen-by-screen audit

The doc describes a 5-tab world (Capture / Items / Movements / Find / More). The
**deployed `main` route tree** (`src/App.tsx:63-76`) is the older 7-route shape:
`/login`, `/signup`, `/capture`, `/items`, `/transfers`, `/stock`, `/dashboard`,
`/barcodes`, `/settings`, `/users`. There is **no `/movements`, `/more`, or `/pending`
route on main**. `src/components/TabBar.tsx` renders **7 tabs**.

### Capture (`/capture`) — ✅ Live
- File: `src/screens/Capture/CaptureScreen.tsx`, routed at `App.tsx:67`.
- Reachable: shelf scan (camera + USB + manual), sticky shelf, zone auto-derive, item form. Gated by `can("capture")` (`CaptureScreen.tsx:97`).
- Deep dive in §3.
- Not wired vs doc: nothing missing; see §3 for the photo-bucket caveat.

### Items (`/items`) — ✅ Live
- File: `src/screens/Items/ItemsScreen.tsx`, routed at `App.tsx:68`.
- Reachable: newest-first list; status/zone/section filter chips; edit-lock lock icon; photo thumbnail (`ItemsScreen.tsx:106-107`); tap row → Item Detail (`ItemDetailModal`). Edit/delete via `EditEntryModal` (`useUpdateEntry`, `useDeleteEntry`).
- Edit-lock from `lib/editLock.ts` (`ItemsScreen.tsx` imports it). Matches doc.

### Item Detail (modal) — ✅ Live
- File: `src/screens/ItemDetail/ItemDetailModal.tsx`. Opened from Items, Find/Dashboard (`DashboardScreen.tsx:279`), and Stock levels.
- Reachable: code, name, total on-hand, per-shelf locations, recent activity (`itemLocations`/`itemActivity` from `lib/itemDetail.ts`). One-tap actions, permission-gated: Stock IN (`:63-67`), per-shelf Move / Out / Edit (`:81-83`) opening `NewTransferModal` / `MovementModal` / `EditEntryModal`.
- Note (not a doc claim, just fact): the photo is **not** shown here — `photo_url` is read only in `ItemsScreen.tsx:107` and `EditEntryModal.tsx:118`.

### Movements (Transfers + Stock) — ⚠️ Partial
- The doc claims a single `/movements` hub with a `[Transfers | Stock]` toggle. **That hub does not exist on `main`.** It lives only on `feat/nav-redesign`.
- What is actually deployed: two separate screens/tabs.
  - Transfers — ✅ Live: `src/screens/Transfers/TransfersScreen.tsx`, routed `App.tsx:69`. List + stats (`transferStats`), New Transfer → `NewTransferModal` (STN via `next_stn_number` RPC, `useCreateTransfer.ts:40`), detail modal.
  - Stock IN/OUT — ✅ Live: `src/screens/Stock/StockScreen.tsx`, routed `App.tsx:70`. IN/OUT buttons → `MovementModal`; "Stock levels" and "History" tabs (`StockLevels`, `MovementHistory`). GRN/MIR via `next_grn_number`/`next_mir_number` (`useCreateMovement.ts:39`). Discrepancy via `available_qty`.
- So: the **features** are live as two screens; the **unified hub the doc describes is not on main**.

### Find / Dashboard (`/dashboard`) — ✅ Live
- File: `src/screens/Dashboard/DashboardScreen.tsx`, routed `App.tsx:71`. (Tab label is "Find" in `TabBar.tsx`; the screen header reads "Dashboard", `DashboardScreen.tsx:105`.)
- Reachable: "Where is this item?" search (`:37-43`, substring over name/master_code/assigned_code) + camera scan-to-locate (`:269-277`), grouped by shelf; items-by-zone bars; NEW vs existing; fullest shelves; recent captures.
- Alerts panel — ✅ Live, gated by `can("view_alerts")` (`:110`): empty locations + recent discrepancies (`emptyLocations`, `discrepancies` from `lib/stockLevels.ts`).

### Barcodes (`/barcodes`) — ✅ Live
- File: `src/screens/Barcodes/BarcodesScreen.tsx`, routed `App.tsx:72`. Reached as its **own tab** on main, not via "More → Tools" (that path is nav-redesign only).
- Reachable: assign `ITM-#####` codes (`useAssignItemCode` → `next_item_code` RPC); single + bulk; item label PDF (`lib/labels.ts`); `ShelfCoverage` card; `ShelfLabels` shelf-label reprint PDF (`lib/shelfLabelPdf.ts`, `useShelves`).
- Dependency: shelf "known/coverage" checks need migration `0014_shelves.sql` applied to the live DB (owner step; not verifiable from source).

### More (`/more`) — 🟡 Stub (route + naming); content ✅ as `/settings`
- The doc's "More" screen is the **Settings** screen on main: `src/screens/Settings/SettingsScreen.tsx`, routed `App.tsx:73` at `/settings`, titled "Settings" (`:18`). There is **no `/more` route**.
- Content present and live: Exports (`export_data`), Access Controls (`change_settings`), Data, Master Data, About, Account/Sign-out, and an admin "Team → Manage users" link (`:24-30`).
- Not wired vs doc: the doc's "Tools card linking to Barcodes" does **not** exist here (`SettingsScreen` links only to `/users`). The `/more` route, the rename, and the Tools card are all nav-redesign-only.

### Users (`/users`) — ✅ Live
- File: `src/screens/Users/UsersScreen.tsx`, routed `App.tsx:74`. Admin-gated (`:29`).
- Reachable: Pending approvals card with "Approve as…" role select (`:52-78`); All users with role change, self disabled (`:80-111`); `RolePermissionsEditor` (`:113`) — the per-role permission matrix (`useRolePermissions`, `useToggleRolePermission`).

### Auth (Login / Sign-up / Pending) — ✅ Live
- Login: `src/screens/Login/LoginScreen.tsx` (`/login`, `App.tsx:64`). Sign-up: `src/screens/Login/SignUpScreen.tsx` (`/signup`, `App.tsx:65`). Both use `lib/validators/auth.ts`.
- Pending: `src/screens/Pending/PendingApprovalScreen.tsx` — **no route**, but rendered by `ProtectedRoute.tsx:27` when `role === "pending"`. Reachable in practice → ✅.

---

## 3. Capture screen — deep dive

Files: `src/screens/Capture/CaptureScreen.tsx`, `ShelfCard.tsx`, `ItemForm.tsx`;
`src/components/CameraScanner.tsx`, `MasterSearch.tsx`, `PhotoCapture.tsx`;
`src/lib/photo.ts`, `src/lib/masterSearch.ts`; `src/hooks/useCreateEntry.ts`, `useUsbScanner.ts`.

### Camera scan (html5-qrcode) — ✅ wired
- `CameraScanner.tsx:2` imports `Html5Qrcode` from `html5-qrcode`; `:40` constructs it; `:57-65` `scanner.start(...)` with formats CODE_128/CODE_39/QR/EAN_13/EAN_8/UPC_A.
- Invoked in Capture two ways: shelf scan modal opened from `ShelfCard` (`CaptureScreen.tsx:115-123`, `onDetected` → `applyShelfWithToast`), and item-barcode scan inside the form (`ItemForm.tsx:210-215`, `onDetected` → `onItemScan`).
- Requires a secure context; on plain-http LAN it warns and closes (`CameraScanner.tsx:28-32`).

### Master typeahead — ✅ live; algorithm is a hand-rolled prefix-ranked substring scan
- `ItemForm.tsx:133` renders `MasterSearch`; `MasterSearch.tsx:18` calls `useMasterSearch(value)`, which wraps `searchMaster` in `src/lib/masterSearch.ts`.
- Not Fuse.js, not Postgres full-text. It is an in-memory linear scan over the client-cached master list (`useMasterItems`). Quoted (`masterSearch.ts:20-46`):

```ts
export function searchMaster(items, query, limit = MASTER_MAX_RESULTS): MasterItem[] {
  const q = query.toUpperCase().trim();
  if (q.length < MASTER_MIN_QUERY) return [];        // MASTER_MIN_QUERY = 4
  const starts: MasterItem[] = [];
  const contains: MasterItem[] = [];
  for (const it of items) {
    const name = (it.name||"").toUpperCase(); const code = (it.code||"").toUpperCase();
    const sku = (it.sku||"").toUpperCase();  const defn = (it.definition||"").toUpperCase();
    if (name.startsWith(q)||code.startsWith(q)||sku.startsWith(q)||defn.startsWith(q)) starts.push(it);
    else if (name.includes(q)||code.includes(q)||sku.includes(q)||defn.includes(q)) contains.push(it);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);   // MASTER_MAX_RESULTS = 12
}
```

- Behavior: needs ≥ 4 chars; "startsWith" ranks above "includes"; matches name/code/sku/definition; capped at 12.

### Photo capture — ⚠️ Partial (wired in code; depends on an unmigrated Storage bucket)
Walk-through:
1. `ItemForm.tsx:196` renders `<PhotoCapture value={photo} onChange={setPhoto} />`.
2. `PhotoCapture.tsx` offers two hidden file inputs — "Camera" (`capture="environment"`, `:67-74`) and "Gallery" (`:75-81`). On pick it runs `compressImage` (`lib/photo.ts:13`, max 1024x1024, JPEG q0.75) and stores a data-URL in form state.
3. On Save, `ItemForm.save()` passes `photoDataUrl: photo`; `CaptureScreen.handleSubmit` uploads only if present: `if (p.photoDataUrl) photoUrl = await uploadEntryPhoto(p.photoDataUrl)` (`CaptureScreen.tsx:55`).
4. `uploadEntryPhoto` (`photo.ts:55-64`) PUTs the blob to Supabase Storage bucket `entry-photos` at `<uid>/<uuid>.jpg` and returns the public URL.
5. The URL is written to `entries.photo_url` via `useCreateEntry.ts:44` (`photo_url: v.photoUrl`). The column exists in migration `0001_initial_schema.sql`.

Why ⚠️ not ✅: the `entry-photos` bucket is created by **no migration** (`photo.ts:11` constant + header comment "Requires a Storage bucket named entry-photos (user action)"). The end-to-end code path is complete and correct, but it depends on an owner-provisioned bucket that source cannot confirm exists in the live project. If the bucket is missing, uploads fail (the save then aborts, `CaptureScreen.tsx:56-59`).

### What does the operator photograph?
- The photo control sits inside the per-item form under the label "Photo" (`ItemForm.tsx:195`). Buttons read "Camera" / "Gallery" (`PhotoCapture.tsx:56,62`); the preview `alt` is "capture" (`:40`). The item-name field placeholder is "Type item name (4+ chars) or scan…" (`MasterSearch.tsx:29`).
- There is **no UI text distinguishing item-vs-shelf**. By placement (one photo per item entry), the intent is a photo of the **item being captured**, not the shelf. No "photograph the shelf" affordance exists anywhere.

### After upload — where is the photo shown?
- Items list thumbnail: `ItemsScreen.tsx:106-107` (`<img src={e.photo_url}>`, 48x48).
- Edit modal: `EditEntryModal.tsx:117-118` (full-width preview).
- A count only: `Settings/DataCard.tsx:8` ("entries with photos").
- Not shown in Item Detail, Find, Stock, or Transfers. Not bundled in CSV export.

### Optional or required?
- Optional and unconditional. `ItemForm.save()` (`:98-119`) requires only a non-empty name; photo is never required and is gated by nothing.

---

## 4. Database — what's real

Source of truth: `supabase/migrations/0001…0014`. Tables in the final applied state, with the columns the app actually touches.

| Table | Created | Columns the app reads/writes (file) | Reads/writes |
|-------|---------|-------------------------------------|--------------|
| `entries` | 0001 (delete policy 0004) | all on SELECT (`useEntries.ts:15`); INSERT all incl. `photo_url`,`scanned_barcode` (`useCreateEntry.ts:48`); UPDATE name/zone/shelf/fixture/qty/defn/category/notes (`useUpdateEntry.ts:54`); UPDATE qty (`useCreateTransfer.ts:75`,`useCreateMovement.ts:68`); UPDATE assigned_code (`useAssignItemCode.ts:21`); DELETE (`useDeleteEntry.ts:17`) | R/W |
| `master_items` | 0001 (sku 0003, section 0008) | SELECT code,name,definition,category,section,unit,sku (`useMasterItems.ts:22`) | R |
| `transfers` | 0001 | SELECT * (`useTransfers.ts:14`); INSERT (`useCreateTransfer.ts:63`) | R/W |
| `movements` | 0001 (available_qty 0010) | SELECT * (`useMovements.ts:14`); INSERT incl. available_qty (`useCreateMovement.ts:60`) | R/W |
| `profiles` | 0001 | SELECT * (`useProfile.ts:18`); SELECT id,email,full_name,role (`useUsers.ts:11`); UPDATE role (`useUpdateUserRole.ts:11`) | R/W |
| `app_settings` | 0009 | SELECT edit_lock_hours (`useAppSettings.ts:13`); UPDATE edit_lock_hours,updated_by,updated_at (`useUpdateEditLockHours.ts:12`) | R/W |
| `role_permissions` | 0013 | SELECT (`useRolePermissions.ts:9`); INSERT/DELETE (`useToggleRolePermission.ts:13-20`) | R/W |
| `shelves` | 0014 | SELECT * (`useShelves.ts:14`) | R |
| `zones` | 0001 (purpose 0002) | **never queried by the app** — see drift | none |

- Enums: `fixture_type(S,G,P,R)`, `user_role(storekeeper,manager,admin,pending)` (pending added 0011), `movement_type(IN,OUT)`.
- Sequences: `stn_seq`, `grn_seq`, `mir_seq`, `item_code_seq` (restarts at 4845, 0007). RPCs used: `next_stn_number`, `next_grn_number`, `next_mir_number`, `next_item_code`.
- Storage: bucket `entry-photos` is **referenced in code** (`photo.ts:11,62,64`) but **created by no migration** — owner-provisioned.
- View `running_stock`: defined 0001, simplified 0010 to `SUM(entries.qty)`; **never queried** by the app (Stock levels rolls up client-side in `lib/stockLevels.ts`).
- RLS highlights: SELECT is open to any authenticated user on all data tables (so `pending` users can READ). INSERT on entries/transfers/movements requires `created_by = auth.uid()` AND role `<> 'pending'`. Role changes are blocked for non-admins by the `guard_role_change` trigger (0012). New signups land as `pending` via `handle_new_user` (0012).

### Drift flags
- No column or table is referenced in `src/` that is missing from migrations (photo_url, available_qty, section, sku, etc. all exist).
- `entry-photos` Storage bucket: in code, not in any migration (see §3, §8).
- `zones` table + `purpose`/`default_category`/`display_order`: created and seeded, **never read by the app** — zone data is served client-side from `src/constants/zones.ts` (`ZONE_INDEX`).
- `running_stock` view: exists, unused by the app.
- `manager_password_hash` (profiles) + `set/verify_manager_password` (0005): unused by live code (see §5, §8).

---

## 5. Components inventory

One line per file in `src/components/` (and `src/components/ui/`); importer = non-test consumer.

- `AppShell.tsx` — App.tsx (wraps protected routes; renders TabBar).
- `AuthProvider.tsx` — App.tsx.
- `Toaster.tsx` — App.tsx.
- `ErrorBoundary.tsx` — App.tsx.
- `ProtectedRoute.tsx` — App.tsx (renders PendingApprovalScreen when pending).
- `Splash.tsx` — AuthProvider, ProtectedRoute.
- `TabBar.tsx` — AppShell (7 tabs).
- `CameraScanner.tsx` — CaptureScreen, ItemForm, NewTransferModal, MovementModal, DashboardScreen.
- `MasterSearch.tsx` — ItemForm, NewTransferModal, MovementModal.
- `PhotoCapture.tsx` — ItemForm.
- `Barcode.tsx` — BarcodesScreen.
- `ManagerUnlock.tsx` — **UNUSED** (no importer anywhere) → 🟡 dead code.
- `ui/Button.tsx` — 22 screens/components (Capture, Items, Stock, Transfers, Dashboard, Login, SignUp, Pending, Barcodes, Settings cards, ErrorBoundary, ManagerUnlock, modals…).
- `ui/Card.tsx` — Items, Stock, Transfers, Dashboard, Barcodes, Users, Settings/Card.
- `ui/Badge.tsx` — Capture, Items, Transfers, Stock, Dashboard, Users, ItemDetail; type used by `constants/roles.ts`.
- `ui/Chip.tsx` — StockScreen, ItemsScreen.
- `ui/Field.tsx` — ItemForm, ShelfCard, EditEntryModal, Login, SignUp, NewTransferModal, MovementModal, ManagerUnlock.
- `ui/Modal.tsx` — ItemDetailModal, EditEntryModal, NewTransferModal, TransferDetailModal, MovementModal, MovementDetailModal, ManagerUnlock.
- `ui/ScreenHeader.tsx` — Capture, Items, Transfers, Stock, Dashboard, Barcodes, Settings, Users.
- `ui/SearchField.tsx` — DashboardScreen.
- `ui/icons.ts` — ~17 screens/components (all lucide icon imports route through here, ADR 0002).

Note: `ManagerUnlock.tsx` is the only unreferenced component. Its only collaborator, `lib/managerPassword.ts`, is therefore also dead in practice.

---

## 6. Hooks inventory

One line per hook in `src/hooks/`; consumer = non-test caller. (No test file imports any hook.)

- `useAuth.ts` — App, ProtectedRoute, UsersScreen, SettingsScreen, PendingApprovalScreen.
- `useProfile.ts` — useAuth (hook-to-hook).
- `useEntries.ts` — Items, ItemDetail, NewTransferModal, ExportsCard, DataCard, Dashboard, StockLevels, MovementModal, BarcodesScreen.
- `useCreateEntry.ts` — CaptureScreen.
- `useUpdateEntry.ts` — EditEntryModal.
- `useDeleteEntry.ts` — EditEntryModal.
- `useMasterItems.ts` — ItemsScreen, ExportsCard, ItemForm.
- `useMasterSearch.ts` — MasterSearch.
- `useDebouncedValue.ts` — DashboardScreen.
- `useUsbScanner.ts` — CaptureScreen.
- `useAssignItemCode.ts` — BarcodesScreen (hook + helpers); `entryCode` also in DashboardScreen.
- `useTransfers.ts` — ItemDetail, TransfersScreen, ExportsCard, DataCard.
- `useCreateTransfer.ts` — NewTransferModal.
- `useMovements.ts` — ItemDetail, Dashboard, MovementHistory.
- `useCreateMovement.ts` — MovementModal.
- `useShelves.ts` — ShelfLabels, ShelfCoverage (`useShelves`); NewTransferModal, ShelfCard, MovementModal (`useShelfChecker`).
- `useAppSettings.ts` — useEditLockPolicy, AccessControlsCard.
- `useEditLockPolicy.ts` — AppShell.
- `useUpdateEditLockHours.ts` — AccessControlsCard.
- `usePermissions.ts` — Capture, Stock, Transfers, Dashboard, Settings, EditEntryModal, ItemDetail.
- `useUsers.ts` — UsersScreen.
- `useUpdateUserRole.ts` — UsersScreen.
- `useRolePermissions.ts` — RolePermissionsEditor.
- `useToggleRolePermission.ts` — RolePermissionsEditor.
- `index.ts` (barrel) — **UNUSED as an import target**; every consumer imports the specific file, never `@/hooks`.

No hook is unused. No hook is test-only.

---

## 7. Lib inventory

One line per non-test file in `src/lib/` (and `src/lib/validators/`).

- `supabase.ts` — the client; imported by ~21 hooks/lib (every data hook, photo.ts, managerPassword.ts, stores/auth.ts).
- `shelf-validator.ts` — ItemForm, NewTransferModal, MovementModal, validators (entry/transfer/movement), useCreate*, useUsbScanner, stores/captureSession.
- `editLock.ts` — ItemsScreen, EditEntryModal, AccessControlsCard, stores/session.
- `entryFilters.ts` — ItemsScreen, useEntries.
- `photo.ts` — CaptureScreen, PhotoCapture.
- `errors.ts` — many screens/components (toast error formatting).
- `labels.ts` — BarcodesScreen (item label PDF).
- `masterSearch.ts` — ItemForm, useMasterSearch.
- `transferMatch.ts` — NewTransferModal, MovementModal.
- `transferStats.ts` — TransfersScreen.
- `csv.ts` — ExportsCard.
- `stockLevels.ts` — StockLevels, DashboardScreen.
- `itemDetail.ts` — ItemDetailModal, ItemsScreen, StockLevels, DashboardScreen.
- `permissions.ts` — usePermissions, useRolePermissions.
- `shelfLabelPdf.ts` — ShelfLabels (shelf reprint PDF).
- `shelfRegistry.ts` — useShelves.
- `shelvesCoverage.ts` — ShelfCoverage.
- `managerPassword.ts` — **only ManagerUnlock.tsx**, which is itself unused → dead in practice (🟡).
- `validators/entry.ts` — useCreateEntry, useUpdateEntry.
- `validators/transfer.ts` — useCreateTransfer.
- `validators/movement.ts` — useCreateMovement.
- `validators/auth.ts` — LoginScreen, SignUpScreen.
- `validators/index.ts` (barrel) — **UNUSED**; consumers import the specific validator files.

---

## 8. Honest gaps (claims I could not fully verify from source)

- **`entry-photos` Storage bucket exists in the live project.** Code uploads to it (`photo.ts:62`), but no migration creates it. Cannot confirm from the repo whether the owner created it in Supabase. To confirm: check the Supabase project's Storage buckets, or attempt a real photo capture on the live site. If absent, all photo captures fail at save.
- **Migrations 0001–0014 are actually applied to the live DB.** The repo holds the SQL; it cannot prove the owner ran `supabase db push`. Features depending on later migrations — `role_permissions` (0013), `shelves`/612-registry (0014), `app_settings` (0009), `available_qty` discrepancies (0010) — work only if those migrations are live. To confirm: query the live DB or exercise each feature on the deployed site.
- **The 4,561-item master + the +316 June append are loaded.** The seed SQL exists; load is an owner step. To confirm: `select count(*) from master_items` on the live DB.
- **`PROJECT-OVERVIEW.md`'s "current" navigation (5 tabs / Movements / More).** This describes `feat/nav-redesign`, which is unmerged. The deployed app is 7 tabs. The doc is ahead of `main`; treat its §3/§9 as aspirational until that branch merges.
- **`docs/Stockhub.docx`.** Not present in the repo working tree; not audited. To confirm any claim unique to it, the file would need to be provided.
- **iOS/Android (Capacitor) and offline-first (SQLite).** Doc marks these parked/not built; consistent with source (no active wiring). Listed ❌ as shipped features.

---

End of audit. Verified against `main` @ `bc83f6f`. No source files were modified.
