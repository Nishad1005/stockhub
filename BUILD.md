# BUILD.md — StockHub v0.2 Build Plan

> **Current phase**: 🟢 Phases 0–8 done + **live on Netlify** — Capture (incl. item-barcode scan + photo), Items/edit/delete + section filter, **Transfers + STN**, **Stock IN/OUT + GRN/MIR**, **Find/Dashboard + Alerts**, **Barcodes** (assign ITM codes + PDF labels + shelf reprint), **Settings/More** (exports, access controls, edit-lock), auth + roles + 10 granular permissions, **6-tab nav** (`Capture · Items · Movements · Find · Barcodes · More`; Movements is a hub with `Transfers | Stock` toggle; More is the renamed Settings; `/transfers`·`/stock` → `/movements` and `/settings` → `/more` redirect). Supabase live (`ocqfpmealzautpsvxuij`); **4,877-item master** (4,561 base + 316 June append) with 6-category + 13-section taxonomy (migration 0008 + `master_enrichment.sql`, applied); 612-shelf registry (migration 0014); `entry-photos` Storage bucket live (confirmed 2026-06-26); `npm run build` green (**85 tests**). Tested on phone via Netlify HTTPS — scanning, transfers, stock IN/OUT, barcodes, exports all confirmed working. Remaining: Phase 9+ (native scanner, offline-first, inventory).
> **UI design system + nav redesign**: both merged to `main`. Design-system layer in `src/components/ui/` (Button incl. ok/bad variants, Badge, Chip, Card, Field, ScreenHeader, SearchField, Modal; lucide icons via `icons.ts` / ADR 0002); full "Warm & Polished" sweep across all screens + modals; Barcodes screen reorganised into two-tab layout (Item barcodes with zone filter chips | Shelf labels reprint). Gate: `tsc --noEmit` clean, `npm run build` green, 85 tests passed.
> **Started**: TBD
> **Target v0.2 launch**: TBD
>
> See [`docs/STATUS.md`](docs/STATUS.md) for a plain-language status + getting-started guide.

This is the living build plan. Update the status table and check off tasks as
you complete them. Each phase has acceptance criteria — do not move to the
next phase until they're met.

---

## Phases at a glance

| # | Phase | Time est. | Status |
|---|-------|-----------|--------|
| 0 | Project scaffold + Supabase setup | 2-3 h | 🟢 done |
| 1 | Data layer (schema, types, hooks) | 4-6 h | 🟢 done |
| 2 | Auth + roles (storekeeper, manager, admin) | 3-4 h | 🟢 done |
| 3 | Port Capture screen | 6-8 h | 🟢 done |
| 4 | Port Items + Edit modal + Edit-lock | 4-5 h | 🟢 done |
| 5 | Port Dashboard (Find) | 3-4 h | 🟢 done |
| 6 | Port Transfers + STN workflow | 5-7 h | 🟢 done |
| 7 | Port Barcodes + label printing | 3-4 h | 🟢 done |
| 8 | Port Settings + Access Controls | 2-3 h | 🟢 done |
| 9 | Native barcode scanner (Capacitor MLKit) | 4-6 h | ⬜ |
| 10 | Offline-first (SQLite mirror + sync queue) | 8-12 h | ⬜ |
| 11 | Inventory module (Credit/Debit + running stock) | 6-8 h | ⬜ |
| 12 | iOS native wrap + TestFlight | 4-6 h | ⬜ |
| 13 | Android native wrap + Play Store internal | 4-6 h | ⬜ |
| 14 | Production hardening (errors, perf, analytics) | 4-6 h | ⬜ |
| 15 | SOP / right-practices doc | 4-5 h | ⬜ |

**Rough total**: 60-90 hours of focused build time. Realistically 3-5 weeks
calendar time with feedback loops.

Status legend: 🟢 done · 🟡 in progress · ⬜ not started · 🔴 blocked

---

## Phase 0 — Project scaffold + Supabase setup

**Goal**: a runnable `npm run dev` that opens a blank-but-styled app with the
chocolate palette, plus a configured Supabase project.

### Tasks
- [x] Project tree created
- [x] `package.json`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.ts`, `capacitor.config.ts`, `postcss.config.js`
- [x] `index.html`, `src/main.tsx`, `src/App.tsx`
- [x] `src/styles/globals.css` with Tailwind + chocolate tokens
- [x] `src/constants/zones.ts`, `src/constants/shelf.ts`, `src/constants/colors.ts`
- [x] `src/lib/shelf-validator.ts` (regex + helpers, ported from HTML)
- [x] `src/lib/supabase.ts` (client wrapper)
- [x] `.env.example`, `.gitignore`, `README.md`
- [x] `supabase/migrations/0001_initial_schema.sql`
- [x] `supabase/migrations/0002_zones_add_purpose.sql` (restores v0.1 `purpose` column)
- [x] `supabase/seed/zones.sql`
- [x] `docs/migration/00-overview.md`
- [ ] **User action**: `npm install`
- [x] **User action**: create Supabase project (`ocqfpmealzautpsvxuij`), URL + anon key in `.env.local`
- [x] **User action**: `npx supabase link --project-ref ocqfpmealzautpsvxuij`
- [x] **User action**: `npx supabase db push` (migrations 0001–0003 applied)
- [ ] **User action**: `npm run dev` and confirm chocolate-themed blank app loads at localhost:5173

### Acceptance
- App loads without errors
- Chocolate background visible
- Supabase ping succeeds (you'll see this in browser devtools network tab)

---

## Phase 1 — Data layer

**Goal**: TypeScript types match Supabase schema 1:1; React Query hooks for
every read/write are defined and tested.

### Tasks
- [x] Run `npx supabase gen types typescript --linked > src/types/database.ts` (also fixed UTF-16→UTF-8)
- [x] Domain types — `MasterItem` (`src/types/master.ts`); `Entry` + `EntryRow/Insert/Update`
      aliases (`src/types/entry.ts`); `Transfer` exists. `Zone`/`User` still TODO.
- [x] `src/lib/supabase.ts` typed client (+ `src/vite-env.d.ts` for `import.meta.env`)
- [x] Fixed `tsconfig.json` TS6305 build blocker (removed `vite.config.ts` from main include)
- [x] **Migration 0004** — `entries` DELETE policy (0001 had none; RLS silently blocked deletes)
- Hooks in `src/hooks/`:
  - [x] `useEntries` + `entriesKeys`; `useCreateEntry`, `useUpdateEntry`, `useDeleteEntry`
  - [x] `useMasterItems` (full cached catalog) + `useMasterSearch(query)` (debounced, v0.1 parity)
  - [ ] `useTransfers`, `useCreateTransfer` — Phase 6
  - [ ] `useDashboardData` — Phase 5
- [x] Supporting: `src/lib/validators/entry.ts` (Zod, v0.1 rules), `src/lib/editLock.ts`
      (client-side lock helper), `src/lib/entryFilters.ts`, `src/stores/session.ts`
      (manualEntryMode / unlockedEntryIds). Unit-tested: 26 tests passing.
- [x] Seed master data: **4,877 items** (4,561 base + 316 June append) from Stock_Analysis CSV via `supabase/seed/build-master.mjs`
      → `supabase/seed/master_items.sql` (preserves v0.1 ITM codes, appends ITM-02028…ITM-04844,
      ERP code in `sku` column; new items beyond the base start at `ITM-04845`). Re-run the script if the CSV is refreshed.
- [ ] **User action**: `npx supabase db push` to apply migration **0004** (entries delete policy)

### Acceptance
- `useEntries()` returns `[]` on a fresh DB
- Creating an entry via the hook succeeds, refetch shows it
- `useMasterSearch("foam")` returns relevant master items
- Deleting an entry succeeds (needs migration 0004 pushed)

---

## Phase 2 — Auth + roles

**Goal**: users can sign in. Four roles live: `pending`, `storekeeper`, `manager`,
`admin`. Manager actions (enable manual entry, edit-lock changes) are gated by
`change_settings` permission; unlock is a session-only toggle. 10 granular permissions
per role are stored in `role_permissions` (migration 0013) and edited in the Users screen.

**Decisions** (confirmed): entry visibility is **shared** — all signed-in users
read all entries (pending write-locked at DB level), keeping the full stock map for everyone;
accounts are **self-sign-up + admin-approval** (new users land as `pending`; migration 0012 adds trigger + `pending` enum value; migration 0011 adds the enum value).

### Tasks
- [ ] **User action**: enable Email provider in Supabase dashboard (Auth → Providers)
- [ ] **User action**: create at least one account (Auth → Users) to sign in with
- [x] `profiles` table with `role` enum + `manager_password_hash` (migration 0001) + auto-create trigger
- [x] Auth store `src/stores/auth.ts` (session) + `useProfile()` (role) + combined `useAuth()`
- [x] Login screen `src/screens/Login/LoginScreen.tsx` (email/password, Zod, brand-themed)
- [x] **Self sign-up** (`/signup`, `SignUpScreen.tsx`) — new users land as `pending`; migration 0012 adds `guard_role_change` trigger + `handle_new_user` trigger; migration 0011 adds `pending` enum value
- [x] **Pending approval screen** (rendered by `ProtectedRoute` when `role === "pending"`)
- [x] `AuthProvider` (init + splash) and `ProtectedRoute` (auth + optional role gate); routes wired in `App.tsx`
- [x] **Migration 0005** — `set_manager_password` / `verify_manager_password` RPCs (bcrypt, per-user) — RPCs exist but `ManagerUnlock` is dead code; real manager override is manual-entry-mode toggle
- [x] **Migration 0013** — `role_permissions` table + 10 granular permissions; `usePermissions` / `useRolePermissions` / `RolePermissionsEditor`
- [x] RLS: kept "entries readable by all authenticated" (shared decision); 0004 added the delete policy; pending users write-blocked by RLS
- [ ] Manager password change UI — RPCs from migration 0005 exist; deferred (ManagerUnlock component is dead code)

### Acceptance
- [x] Cannot reach `/capture` without auth (redirects to `/login`)
- [x] New self-signup lands as `pending` and sees the waiting screen
- [x] Admin can approve + assign role via Users screen
- [x] Permissions matrix is editable per role (storekeeper / manager; admin locked to full)
- [x] Sign-out works, session persists across page reloads (Supabase persistSession)

---

## Phase 3 — Capture screen

**Goal**: pixel/behavior parity with v0.1's Capture flow.

**Reference**: `legacy/UM_Designs_StockHub.html` lines 597–700 (markup) and
1100–1300 (logic). Migration spec: `docs/migration/01-capture.md`.

### Tasks
- [x] `src/screens/Capture/CaptureScreen.tsx` — orchestration (+ `ShelfCard`, `ItemForm`)
- [x] `useCaptureSession` Zustand store — `activeZone`, `activeShelf`, `activeFixtureType`,
      `scanMode`; `applyShelf()` auto-derives zone (manualEntryMode is in `stores/session.ts`)
- [x] `ShelfCard` — readonly/manual input + scan button + sticky status + ✕ clear + zone display
- [x] `CameraScanner` — html5-qrcode modal (native MLKit deferred to Phase 9)
- [x] USB scanner listener (`useUsbScanner`, port of `handleUsbScannerKey`)
- [x] `MasterSearch` typeahead + match badge (MATCHED / SCANNED / NEW)
- [x] Form fields: name, definition, category, qty, notes, photo
- [x] Save → `useCreateEntry`, sticky shelf, category kept, focus jumps to name
- [x] Photo capture + on-device compress + upload (`lib/photo.ts`) — needs `entry-photos` bucket
- [x] Toast system (`stores/toast.ts` + `Toaster`) replacing v0.1 `toast()`
- [ ] Item-barcode scan → master lookup (deferred — items aren't labeled until the Barcodes phase)
- [ ] Lazy-load `CameraScanner` to trim the bundle (html5-qrcode is ~115 KB gz)

### Acceptance
- [x] Scan a shelf code → zone auto-set, shelf set, form revealed
- [x] Type in name input → master suggestions appear
- [x] Save → entry created (visible in Items once that screen exists)
- [x] Shelf stays sticky for next entry
- [x] Manual entry mode (manager-unlocked) allows typing
- [x] Works with USB scanner anywhere on the screen

### Photos status
The `entry-photos` Storage bucket was **created in the live project on 2026-06-26** (public, authenticated-insert + public-read). Photo-attached captures now save and thumbnails display. The bucket is **owner-provisioned** — a fresh Supabase environment must recreate it (no migration covers it). A Storage failure still aborts the entire entry save rather than degrading gracefully — a hardening candidate for Phase 14.

---

## Phase 4 — Items + Edit + Edit-lock

**Reference**: HTML lines 1450–1700. Migration spec: `docs/migration/04-items.md`.

### Tasks
- [x] `ItemsScreen` — list with filters (status chips + zone chips), newest-first, counts
- [x] Entry row — thumbnail, code badge (existing/assigned/NEW), name, shelf, zone, qty, 🔒 lock icon
- [x] `EditEntryModal` — edit all fields + delete (two-step confirm); locked banner + unlock
- [x] Edit-lock logic in `src/lib/editLock.ts` — `isEntryLocked(entry, ctx)` (built Phase 1)
- [x] `TabBar` + `AppShell` — bottom nav (Capture / Items)
- [x] Update + delete mutations (`useUpdateEntry`, `useDeleteEntry`)
- [ ] `ManagerUnlock` component exists but the edit unlock is **password-free** per user request
      (manual toggle unlocks globally too). Revisit gating if needed.
- [ ] Photo replace in the edit modal (display only for now)

### Acceptance
- [x] All v0.1 filters work (status + zone, live counts)
- [x] Locked entries show 🔒 + can't be saved until unlocked
- [x] Unlock is session-scoped, never persists to DB
- [x] Photos display (replace deferred)

---

## Phase 5 — Dashboard

**Reference**: HTML lines 1900–2050 (renderDashboard function). Migration
spec: `docs/migration/05-dashboard.md`.

### Tasks
- [x] `DashboardScreen` — "Find" tab: where-is-this-item, by-zone, NEW-vs-existing, fullest shelves, recent
- [x] `WhereIsThisItem` (search + scan, grouped by shelf)
- [x] Items-by-zone bars + NEW-vs-existing split + fullest shelves
- [x] `RecentActivity` (recent captures feed, last 15)
- [x] Derived from `useEntries` (no separate aggregated query needed at this scale)
- [ ] Recharts charts + transfers in the feed — deferred until Transfers (Phase 6) exists

### Acceptance
- [x] Where-is-this-item returns the shelf(s) for a typed/scanned item
- [x] Search debounced (200ms)
- [x] Recent activity sorted desc

> **Stage B (master enrichment surfacing)** also shipped here: migration 0008 adds
> `master_items.section`; `master_enrichment.sql` fills the 6-category + 13-section
> taxonomy (4,877-item catalogue total); Capture shows a home-area hint on matches, Items shows it per row +
> an "All Areas" filter.

---

## Phase 6 — Transfers + STN workflow

**Reference**: HTML lines 1870–2280. Spec: `docs/superpowers/specs/2026-06-15-transfers-stn-design.md`;
plan: `docs/superpowers/plans/2026-06-15-transfers-stn.md`.

### Tasks
- [x] `TransfersScreen` with list of past STNs + Today/Week/Total stats (`src/screens/Transfers/`)
- [x] `NewTransferModal` — master search, source shelf (scan), dest shelf (scan), qty, reason, storekeeper/helper
- [x] STN number generation: Postgres `stn_seq` + `next_stn_number()` (already in migration 0001 — server-side, monotonic)
- [x] Source-entry detection (`findSourceEntry`; banner + confirm if qty > available)
- [x] Transfer applies: insert STN row, decrement source entry, create dest entry (`useCreateTransfer`)
- [x] `TransferDetailModal`
- [x] Zone auto-derives from the scanned shelf (deviation from v0.1's zone dropdowns, per §5.2)
- [x] CSV export of transfers — done in **Phase 8** (Settings/exports, gated by `export_data`)
- [x] **Stock IN/OUT** (`StockScreen`) — GRN/MIR server sequences, `MovementModal`, discrepancy recording (`available_qty`), Stock levels tab + Movement history tab; all live under the Movements hub (`/movements` with `Transfers | Stock` toggle)
- [x] Movements unified hub (`/movements`) — nav redesign merged to `main`; `/transfers`·`/stock` → `/movements` redirect

> **Deferred:** the `running_stock` view double-counts a transfer (entries are mutated
> *and* the view re-applies it). The view is unused until Phase 11, so reconcile it then —
> see the design spec §7.

### Acceptance
- STN number monotonic, format `STN/2026-06/0042`
- Source qty correctly decremented
- Scan-only for both source AND dest shelves
- Validation matches v0.1 exactly

---

## Phase 7 — Barcodes + label printing

**Reference**: HTML lines 700–800 (markup) + 1700–1850 (logic).

### Tasks
- [x] `BarcodesScreen` — two-tab layout: **Item barcodes** (with zone filter chips) | **Shelf labels reprint**
- [x] Assign code server-side via `next_item_code()` → persisted to `entries.assigned_code`
      (+ **migration 0007** restarts `item_code_seq` at 4845 so codes don't collide with the master)
- [x] `Barcode` component (JsBarcode CODE128) + bulk "Assign codes to N NEW"
- [x] Download item label PDFs (`lib/labels.ts`, jsPDF lazy-loaded, 100×50mm layout)
- [x] **Shelf labels reprint** — pick a zone → PDF of that zone's shelf barcodes matching the already-printed physical set (`lib/shelfLabelPdf.ts`, `useShelves`)
- [x] `ShelfCoverage` card — registered-shelf counts per zone (depends on migration 0014 applied)
- [ ] "Print Now" via browser print dialog — deferred (PDF download covers mobile)

### Acceptance
- [x] Item codes increment correctly (server sequence, no master collisions)
- [x] Coded items selectable → PDF of 100×50mm labels with barcode
- [x] Shelf label reprint PDF matches the existing physical labels
- [ ] Exact match to `UM_Shelf_Labels_152-207.pdf` layout — close, refine if needed

---

## Phase 8 — Settings + Access Controls

**Reference**: HTML lines 766–820, 1862–1900.

### Tasks
- [x] `SettingsScreen` (routed at `/more`, renamed "More") — exports, data summary, access controls, about, account, team link
- [x] Edit-lock window selector (`useUpdateEditLockHours`, gated by `change_settings`)
- [x] Manual entry mode toggle (session-only, gated by `change_settings`)
- [x] CSV export of entries and transfers (BOM-prefixed for Excel/Devanagari, gated by `export_data`)
- [x] 10 granular permissions system (`role_permissions` table, migration 0013; `usePermissions` / `useRolePermissions` / `RolePermissionsEditor` on Users screen)
- [x] Users screen: pending approvals, role management, per-role permission matrix (admin-only)
- [x] `/settings` → `/more` redirect; nav tab renamed More
- [ ] Manager password change (requires old password) — RPCs from migration 0005 exist but `ManagerUnlock` component is dead code; revisit if needed
- [ ] ZIP export with photos — not built (CSV-only for now)

### Acceptance
- [x] Exports produce correct CSV
- [x] Edit-lock window change takes effect immediately
- [x] Toggle persists for session, resets on reload
- [ ] Password change validates current password — deferred

---

## Phase 9 — Native barcode scanner

**Goal**: replace html5-qrcode with native MLKit scanner on iOS/Android for
much better performance and reliability. Keep html5-qrcode as web fallback.

### Tasks
- [ ] `npm install @capacitor-mlkit/barcode-scanning`
- [ ] Wrapper hook `useBarcodeScanner()` — detects platform, picks impl
- [ ] iOS permissions in `ios/App/App/Info.plist`
- [ ] Android permissions in `android/app/src/main/AndroidManifest.xml`
- [ ] Test on real device (simulator camera is fake)

### Acceptance
- Scan rate <500ms on a printed Z1-S001 label, native
- Web fallback still works in Chrome on desktop

---

## Phase 10 — Offline-first

**Goal**: full functionality without internet. Captures, edits, transfers all
queue locally and sync when online.

### Tasks
- [ ] `@capacitor-community/sqlite` for local mirror of `entries` + `transfers`
- [ ] On startup: pull latest from Supabase, merge with local
- [ ] Mutations write to local SQLite first, then sync
- [ ] Sync queue with retry + exponential backoff
- [ ] Conflict resolution: server wins for edits, append-only for captures
- [ ] Sync status indicator in UI (header dot: green/yellow/red)

### Acceptance
- Airplane mode on, capture 5 items, airplane mode off → all 5 sync within 10s
- Two devices capture different items offline, both come online → both sets sync
- Edit conflict on same entry → server version wins, user notified

---

## Phase 11 — Inventory module (Credit/Debit)

**Reference**: planned in v0.1 chat, not yet built. Approach A confirmed by
user: Capture = opening balance, movements adjust.

### Tasks
- [ ] DB tables: `movements` (type IN/OUT, ref, qty, source/dest, reason, authorized_by)
- [ ] Consolidate Transfers + Movements into one "Movements" tab with type selector
- [ ] Reference number generators: `GRN/YYYY-MM/NNNN`, `MIR/YYYY-MM/NNNN`, `DC/YYYY-MM/NNNN`
- [ ] Running stock computed: `capture.qty + Σ credits − Σ debits − Σ outbound_transfers + Σ inbound_transfers`
- [ ] Dashboard cards: today's IN/OUT totals, low-stock alerts
- [ ] CSV export of movements

### Acceptance
- Credit 10 of an item → running stock = capture qty + 10
- Debit 3 → running stock decreases by 3
- Negative-stock attempt blocked unless manager override

---

## Phase 12 — iOS native wrap

### Tasks
- [ ] Apple Developer account ($99/yr) — user action
- [ ] App icons (1024×1024 + auto-generated sizes via `@capacitor/assets`)
- [ ] Splash screens
- [ ] `npx cap add ios && npx cap sync ios`
- [ ] Open in Xcode, set bundle ID `com.dbbsgroup.umstockhub`
- [ ] Configure signing
- [ ] Test on physical iPhone via cable
- [ ] Archive → upload to TestFlight
- [ ] Internal testing with U&M team

### Acceptance
- App installs on a real iPhone via TestFlight
- Camera permission prompt appears + works
- Login + capture + sync all work
- No crash in first 30 minutes of typical use

---

## Phase 13 — Android native wrap

### Tasks
- [ ] Google Play Console account ($25 one-time) — user action
- [ ] `npx cap add android && npx cap sync android`
- [ ] Open in Android Studio, configure signing key
- [ ] Generate signed app bundle
- [ ] Upload to Play Console internal testing track
- [ ] Test on physical Android device

### Acceptance
- App installs on a real Android phone via Play Store internal track
- All camera + sync features work
- No crash in 30 min of use

---

## Phase 14 — Production hardening

### Tasks
- [ ] Sentry integration for error reporting
- [ ] Plausible or PostHog for usage analytics (no PII)
- [ ] React Error Boundary on each screen
- [ ] Performance: lazy-load Recharts, Dashboard screen
- [ ] Lighthouse audit > 90 on web
- [ ] Service worker for PWA install on web

### Acceptance
- Errors caught + reported, not white-screen
- Initial bundle <300KB gzipped
- Lighthouse PWA install prompt works

---

## Phase 15 — SOP doc

Word document — "Right Practices for U&M Designs StockHub" — covering Capture
vs Movement decision rules, FIFO, cycle counting, edit-lock, end-of-month
closure. Branded as the other U&M SOPs.

---

## Decisions log

See `docs/decisions/` — one ADR per significant choice.

Initial ADRs:
- `0001-tech-stack.md` — why React + Capacitor + Supabase

---

## Open questions (resolve before relevant phase)

1. **Zone naming**: should app zones be renamed to match factory (FABRIC, FOAM
   DEP., WOOD, PACKAGING) instead of legacy RAW-MATERIALS / RAW-BULK/SLOW etc.?
   → User to provide full 11-zone list
2. **Cycle counting workflow**: SOP-driven feature, post v1.0?
3. **Multi-store**: currently single-store (Store Tanawada). v2.0 adds multi?
4. **Reports**: monthly closing report PDF — needed for v1.0 or later?
5. **Photo retention**: keep all photos forever, or auto-archive after N months?

---

End of BUILD.md. Update status table after each session.
