# BUILD.md — StockHub v0.2 Build Plan

> **Current phase**: 🟢 Phases 1–4 + 7 done — Capture, Items/edit/delete, **Barcodes** (assign ITM codes + PDF labels), auth, tab nav. Supabase live (`ocqfpmealzautpsvxuij`); 4,561-item master seeded; `npm run build` green (29 tests). **Mobile-first next**: deploy to Netlify (HTTPS → phone camera) + push migration 0007 (item-code sequence). Remaining: Phase 5 (Dashboard), Phase 6 (Transfers), Phase 8 (Settings), Phase 9+ (native).
> **Started**: TBD
> **Target v0.2 launch**: TBD

This is the living build plan. Update the status table and check off tasks as
you complete them. Each phase has acceptance criteria — do not move to the
next phase until they're met.

---

## Phases at a glance

| # | Phase | Time est. | Status |
|---|-------|-----------|--------|
| 0 | Project scaffold + Supabase setup | 2-3 h | 🟡 In progress |
| 1 | Data layer (schema, types, hooks) | 4-6 h | ⬜ Not started |
| 2 | Auth + roles (storekeeper, manager, admin) | 3-4 h | ⬜ |
| 3 | Port Capture screen | 6-8 h | ⬜ |
| 4 | Port Items + Edit modal + Edit-lock | 4-5 h | ⬜ |
| 5 | Port Dashboard | 3-4 h | ⬜ |
| 6 | Port Transfers + STN workflow | 5-7 h | ⬜ |
| 7 | Port Barcodes + label printing | 3-4 h | ⬜ |
| 8 | Port Settings + Access Controls | 2-3 h | ⬜ |
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
- [x] Seed master data: 4,561 items from Stock_Analysis CSV via `supabase/seed/build-master.mjs`
      → `supabase/seed/master_items.sql` (preserves v0.1 ITM codes, appends ITM-02028…ITM-04844,
      ERP code in `sku` column). Re-run the script if the CSV is refreshed.
- [ ] **User action**: `npx supabase db push` to apply migration **0004** (entries delete policy)

### Acceptance
- `useEntries()` returns `[]` on a fresh DB
- Creating an entry via the hook succeeds, refetch shows it
- `useMasterSearch("foam")` returns relevant master items
- Deleting an entry succeeds (needs migration 0004 pushed)

---

## Phase 2 — Auth + roles

**Goal**: users can sign in. Three roles supported: `storekeeper`, `manager`,
`admin`. Manager actions (unlock entry, enable manual entry) check the
manager-password column on the user row.

**Decisions** (confirmed): entry visibility is **shared** — all signed-in users
read all entries (owner/manager edit), keeping the full stock map for everyone;
accounts are **admin-provisioned** (login-only, no public sign-up).

### Tasks
- [ ] **User action**: enable Email provider in Supabase dashboard (Auth → Providers)
- [ ] **User action**: create at least one account (Auth → Users) to sign in with
- [x] `profiles` table with `role` enum + `manager_password_hash` (migration 0001) + auto-create trigger
- [x] Auth store `src/stores/auth.ts` (session) + `useProfile()` (role) + combined `useAuth()`
- [x] Login screen `src/screens/Login/LoginScreen.tsx` (email/password, Zod, brand-themed)
- [x] `AuthProvider` (init + splash) and `ProtectedRoute` (auth + optional role gate); routes wired in `App.tsx`
- [x] **Migration 0005** — `set_manager_password` / `verify_manager_password` RPCs (bcrypt, per-user)
- [x] RLS: kept "entries readable by all authenticated" (shared decision); 0004 added the delete policy
- [ ] Settings: change own / reset team passwords — **Phase 8** (RPCs from 0005 are ready)
- [ ] `useManagerPassword()` typed hook — add after `db push` 0005 + `db:types` regen (used by the
      Phase 4 unlock flow). RPC names aren't in the generated types until then.

### Acceptance
- [x] Cannot reach `/capture` without auth (redirects to `/login`)
- A storekeeper account can capture but cannot unlock locked entries (storekeeper has no manager password)
- A manager can unlock with their password (verify_manager_password) — wired in Phase 4
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

### User action to enable photos
Create a Storage bucket `entry-photos` (Dashboard → Storage → New bucket). Then add
insert access for authenticated users + read access. Capture works without it; only
photo upload needs it.

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
- [ ] `DashboardScreen` — 5 cards as in v0.1
- [ ] `ItemsByZoneChart` (Recharts BarChart)
- [ ] `NewVsExistingBar` (custom split bar)
- [ ] `TopBottomShelves` (two-column list)
- [ ] `WhereIsThisItem` (search with grouped results)
- [ ] `RecentActivity` (merged captures + transfers feed)
- [ ] `useDashboardData` hook — single aggregated query

### Acceptance
- Each card matches v0.1 visually + functionally
- Search debounced (250ms)
- Recent activity sorted desc, capped at 20 items

---

## Phase 6 — Transfers + STN workflow

**Reference**: HTML lines 1870–2280. Migration spec: `docs/migration/06-transfers.md`.

### Tasks
- [ ] `TransfersScreen` with list of past STNs
- [ ] `NewTransferModal` — item search, source shelf (scan), dest shelf (scan), qty, reason, names
- [ ] STN number generation: Postgres sequence `stn_seq`, function `next_stn()`
- [ ] Source-entry detection (warn if qty > available)
- [ ] Transfer applies: decrement source qty, create dest entry (or increment if same item already there)
- [ ] Transfer detail modal
- [ ] CSV export of transfers

### Acceptance
- STN number monotonic, format `STN/2026-06/0042`
- Source qty correctly decremented
- Scan-only for both source AND dest shelves
- Validation matches v0.1 exactly

---

## Phase 7 — Barcodes + label printing

**Reference**: HTML lines 700–800 (markup) + 1700–1850 (logic).

### Tasks
- [x] `BarcodesScreen` — all items; NEW ones show "Assign ITM code"; coded ones show a CODE128 barcode
- [x] Assign code server-side via `next_item_code()` → persisted to `entries.assigned_code`
      (+ **migration 0007** restarts `item_code_seq` at 4845 so codes don't collide with the master)
- [x] `Barcode` component (JsBarcode CODE128) + bulk "Assign codes to N NEW"
- [x] Download PDF labels (`lib/labels.ts`, jsPDF lazy-loaded, 100×50mm layout)
- [ ] "Print Now" via browser print dialog — deferred (PDF download covers mobile)

### Acceptance
- [x] Item codes increment correctly (server sequence, no master collisions)
- [x] Coded items selectable → PDF of 100×50mm labels with barcode
- [ ] Exact match to `UM_Shelf_Labels_152-207.pdf` layout — close, refine if needed

---

## Phase 8 — Settings + Access Controls

**Reference**: HTML lines 766–820, 1862–1900.

### Tasks
- [ ] `SettingsScreen` — exports, storage info, access controls, about
- [ ] Manager password change (requires old password)
- [ ] Edit-lock window selector
- [ ] Manual entry mode toggle (password-gated)
- [ ] CSV export, ZIP export with photos

### Acceptance
- All v0.1 Settings features work
- Password change validates current password
- Toggle persists for session, resets on reload

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
