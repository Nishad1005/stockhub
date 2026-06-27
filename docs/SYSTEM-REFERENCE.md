# StockHub v0.2 — System Reference (Architecture & Database)

> A single reference for how the whole app is built: features, tech, the complete
> database (schema, functions, triggers, RLS), the roles/permissions model, and how
> to run/deploy. Current as of 2026-06-28.

---

## 1. What this is

**U&M Designs StockHub v0.2** — a warehouse stock-management web app (mobile-first,
phone-camera scanning) for U&M Designs Pvt Ltd (furniture/upholstery, Jodhpur). It is a
production re-implementation of the v0.1 single-file HTML prototype.

**Live**: deployed on **Netlify** (auto-build on `git push` to `main`). Backend is **Supabase**
(project ref `ocqfpmealzautpsvxuij`).

### Build status (all live)
| Area | State |
|------|-------|
| Auth + roles (storekeeper / manager / admin / **pending**) | ✅ + self-signup + admin approval |
| Capture (scan shelf → log items, sticky shelf, USB + camera + manual) | ✅ |
| Photos (camera/gallery → compressed → Supabase Storage → thumbnail) | ✅ |
| Items (browse/filter, edit, delete, edit-lock) | ✅ |
| Movements hub (`/movements`): Transfers + STN \| Stock IN/OUT + GRN/MIR + discrepancies | ✅ |
| Find / Dashboard (locate item, zone stats, manager alerts) | ✅ |
| Barcodes — **Item barcodes** (zone filter + bulk assign + PDF) \| **Shelf labels** (zone reprint) | ✅ |
| More / Settings (CSV exports, edit-lock policy, manual-entry, account/sign-out) | ✅ |
| Item Detail + one-tap actions (Move/IN/OUT/Edit pre-filled) | ✅ |
| Users management + **granular per-role permissions editor** | ✅ |
| **6-tab navigation** (Capture · Items · Movements · Find · Barcodes · More) | ✅ |

**Not built yet**: native iOS/Android wrap (parked), offline-first, production hardening,
SOP doc. Pinned cosmetic: real zone names for Z1–Z6 (awaiting Zone 1's name).

---

## 2. Tech stack

| Layer | Choice |
|-------|--------|
| Frontend | React 18 + TypeScript, Vite |
| Styling | Tailwind (chocolate `brand-*` tokens) |
| Global client state | Zustand (`auth`, `session`, `captureSession`, `toast`) |
| Server state | TanStack Query v5 (all data hooks) |
| Routing | React Router v6 |
| Validation | Zod |
| Backend | Supabase (Postgres + Auth + Storage + RLS) |
| Barcodes/labels | html5-qrcode (scan), JsBarcode, jsPDF |
| Icons | lucide-react (via `src/components/ui/icons.ts`, ADR 0002) |
| Tests | Vitest (85 passing) |
| Hosting | Netlify (web) |

**Design system**: shared `src/components/ui/` layer — `Button` (variants: primary, secondary,
ghost, danger, ok, bad), `Badge`, `Chip`, `Card`, `Field` (Input/Label), `ScreenHeader`,
`SearchField`, `Modal`, `icons.ts`. All icons route through `icons.ts` (lucide-react, ADR 0002).
Chocolate `brand-*` tokens throughout; never raw hex in components.

**State rule**: server data → React Query; global client state → Zustand; local UI → `useState`.
Never mix.

---

## 3. Project structure

```
src/
├── App.tsx                  Router + providers; route table
├── components/              AppShell, TabBar, ProtectedRoute, CameraScanner, MasterSearch, Toaster…
├── constants/               zones.ts, shelf.ts, permissions.ts
├── lib/                     supabase client, validators/, csv.ts, stockLevels.ts, itemDetail.ts,
│                            permissions.ts, transferMatch.ts, shelf-validator.ts, editLock.ts, errors.ts,
│                            barcodeZones.ts, labels.ts, shelfLabelPdf.ts, shelfRegistry.ts, shelvesCoverage.ts,
│                            photo.ts, masterSearch.ts, transferStats.ts, managerPassword.ts (dead)
├── stores/                  auth.ts, session.ts, captureSession.ts, toast.ts (Zustand)
├── hooks/                   one per data concern (useEntries, useTransfers, useMovements,
│                            useAppSettings, useUsers, useRolePermissions, usePermissions,
│                            useShelves, useAssignItemCode, useEditLockPolicy, …)
├── types/                   database.ts (generated), entry.ts, transfer.ts, movement.ts, profile.ts, master.ts
└── screens/                 one folder per route (Capture, Items, Movements, Stock, Transfers, Dashboard,
                             Barcodes, Settings, Users, ItemDetail, Login, Pending)
supabase/migrations/         0001 … 0014 (canonical SQL — source of truth)
supabase/seed/               zones.sql, master_items.sql, master_enrichment.sql, build-master.mjs
docs/                        STATUS.md, SYSTEM-REFERENCE.md (this), superpowers/specs + plans
legacy/UM_Designs_StockHub.html   v0.1 prototype (read-only spec)
```

**Navigation**: 6 bottom tabs — `Capture · Items · Movements · Find · Barcodes · More`.
- **Movements** (`/movements`) is a hub screen (`src/screens/Movements/MovementsScreen.tsx`) that
  renders a `ScreenHeader` + a `Transfers | Stock` `Chip` toggle, embedding `TransfersScreen` or
  `StockScreen` as fragments (they no longer render their own page header). Old routes `/transfers`
  and `/stock` redirect to `/movements`.
- **More** (`/more`) is the renamed Settings screen — `src/screens/Settings/SettingsScreen.tsx`
  (titled "More"). Old route `/settings` redirects to `/more`.
- **Barcodes** keeps its own top-level tab.
- Admin-only `/users` is reached from More → Team → Manage users.
- `/signup` and `/login` (public) and the pending-approval screen (no route, rendered by the route
  guard) have no tab.

---

## 4. Database — enums, tables, sequences

Postgres on Supabase. Below is the **consolidated current state** after migrations 0001–0014.
The migration files are the source of truth.

### Enums
```sql
fixture_type   = ('S','G','P','R')                              -- Shelf, Ghoda, Pallet, Rack
user_role      = ('storekeeper','manager','admin','pending')    -- 'pending' added in 0011
movement_type  = ('IN','OUT')
```

### Sequences
```sql
stn_seq        -- transfer STN numbers
grn_seq        -- stock-IN GRN numbers
mir_seq        -- stock-OUT MIR numbers
item_code_seq  -- new ITM codes; RESTART WITH 4845 (0007)
```

### Tables

**zones** — physical warehouse areas (Z01–Z11).
```sql
code             text PK  check (code ~ '^Z[0-9]{2}$')
name             text not null
default_category text          -- pre-fills Capture category
purpose          text          -- (0002) subtitle shown in UI
display_order    int  not null default 0
```

**master_items** — the **4,877-item catalogue** (4,561 base items re-seeded from factory CSV + 316
appended in the June 2026 refresh; codes `ITM-00001`–`ITM-04844` preserved by name-match, new codes
from `ITM-04845` onward).
```sql
code        text PK  check (code ~ '^ITM-[0-9]{5}$')
name        text not null
definition  text
category    text            -- cleaned 6-value taxonomy
section     text            -- (0008) 13-value "home area"
unit        text
sku         text            -- (0003) factory ERP "Product Code"
created_at  timestamptz default now()
```

**profiles** — one per auth user (role lives here).
```sql
id          uuid PK  references auth.users on delete cascade
email       text not null unique
full_name   text
role        user_role not null default 'pending'   -- default changed to 'pending' in 0012
manager_password_hash text       -- (0005) DEAD/UNUSED — superseded by role model
created_at  timestamptz default now()
updated_at  timestamptz default now()
```

**entries** — captured stock; **`qty` is the live source of truth** (see §7).
```sql
id              uuid PK default gen_random_uuid()
created_at      timestamptz default now()
updated_at      timestamptz default now()       -- auto via set_updated_at trigger
created_by      uuid not null references profiles(id)
zone_code       text not null references zones(code)
shelf_code      text not null check (~ '^Z[0-9]+-[SGPR][0-9]+$')
fixture_type    fixture_type not null
name            text not null
master_code     text references master_items(code)   -- matched catalogue item, else null (NEW)
assigned_code   text                                  -- ITM code assigned to a NEW item
defn, category  text
qty             numeric            -- live on-hand at this shelf
notes, photo_url, scanned_barcode  text
-- indexes: zone, shelf, master, created_at
```

**transfers** — STN-tracked moves between shelves (audit log).
```sql
id, created_at, created_by
stn_number      text not null unique               -- STN/YYYY-MM/NNNN
item_code text references master_items(code), item_name text not null, item_defn, item_category
source_zone/source_shelf, dest_zone/dest_shelf      -- shelf checks ~ shelf regex
qty             numeric not null check (qty > 0)
reason, storekeeper, helper  text
source_deducted boolean not null default false
notes           text
```

**movements** — Stock IN/OUT ledger (audit log).
```sql
id, created_at, created_by
type            movement_type not null             -- IN | OUT
ref_number      text not null unique               -- GRN/… (IN) or MIR/… (OUT)
item_code text references master_items(code), item_name text not null
shelf_code, zone_code, fixture_type
qty             numeric not null check (qty > 0)
source_or_dest  text not null                       -- supplier (IN) / department (OUT)
reason, authorized_by, notes  text
available_qty   numeric                             -- (0010) on-hand at OUT time; discrepancy when qty > available_qty
-- indexes: type, shelf, item, created_at
```

**app_settings** — single-row shared config (0009).
```sql
id              smallint PK default 1 check (id = 1)
edit_lock_hours int not null default 24 check (in (1,6,12,24,48,168))
updated_at      timestamptz default now()
updated_by      uuid references profiles(id)
```

**role_permissions** — granular per-role permissions (0013). A row = that role is granted that permission.
```sql
role        user_role not null
permission  text not null                           -- one of the 10 PermissionKeys (§6)
primary key (role, permission)
```

**shelves** — the 612 physical shelf registry for Z01–Z06 (0014). Used for "known shelf" checks
and the coverage card in Barcodes.
```sql
code         text PK  check (code ~ '^Z[0-9]+-[SGPR][0-9]+$')
zone_code    text not null references zones(code)
fixture_type fixture_type not null
seq          int  not null
unique (zone_code, fixture_type, seq)
```
> Note: `zones` (Z01–Z11) exists in the DB but is **never queried** by the app — zone data is
> served client-side from `src/constants/zones.ts`. `shelves` (Z01–Z06) IS queried via `useShelves`.

---

## 5. Functions, triggers, views

### Functions
| Function | Purpose |
|----------|---------|
| `set_updated_at()` | trigger fn — bumps `entries.updated_at` |
| `current_user_role()` | `stable` — returns the caller's role from `profiles` (used throughout RLS) |
| `next_stn_number()` | `STN/YYYY-MM/NNNN` from `stn_seq` |
| `next_grn_number()` / `next_mir_number()` | `GRN/…` `MIR/…` from `grn_seq`/`mir_seq` (0010) |
| `next_item_code()` | `ITM-NNNNN` from `item_code_seq` |
| `handle_new_user()` | `security definer` — on signup, inserts a profile (role **`pending`** after 0012); hardened search_path (0006) |
| `guard_role_change()` | `security definer` (0012) — **rejects any `profiles.role` change unless caller is admin** |
| `set_manager_password()` / `verify_manager_password()` | (0005) **DEAD/UNUSED** — role model replaced the password gate |

### Triggers
- `entries_set_updated_at` — BEFORE UPDATE on `entries` → `set_updated_at()`
- `on_auth_user_created` — AFTER INSERT on `auth.users` → `handle_new_user()`
- `guard_role_change` — BEFORE UPDATE on `profiles` → `guard_role_change()`

### View — `running_stock` (simplified in 0010)
```sql
create or replace view running_stock as
  select master_code, shelf_code, sum(coalesce(qty,0))::numeric as stock
  from entries where master_code is not null
  group by master_code, shelf_code;
```
> Originally (0001) it re-summed movements+transfers on top of entries, which **double-counted**
> because the app also mutates entries on every transfer/movement. 0010 reduced it to a pure sum of
> `entries.qty` (the single source of truth). The Stock-levels UI computes rollups client-side from
> entries (so NEW/unassigned items are included too); this view is kept correct for any SQL consumer.

---

## 6. Roles & permissions

### Roles (`user_role`)
- **pending** — new signups land here. **No app access** (gated to a "waiting for approval" screen)
  and **cannot write** stock data even via the API.
- **storekeeper** / **manager** / **admin** — working roles. Admin can manage users + always has every permission.

### Granular permissions (UI-enforced, per-role)
The 10 toggleable abilities (`src/constants/permissions.ts`):
`capture · transfer · stock_in · stock_out · edit_entry · delete_entry · export_data ·
unlock_entry · change_settings · view_alerts`.

- Stored in `role_permissions` (row = granted). Admins edit the matrix on the **Users** screen.
- Resolved by `usePermissions().can(key)` → `resolveCan(map, role, perm)`:
  **admin → always true**; **null/pending → always false**; otherwise the granted set.
- **Enforcement is UI-only** (which buttons appear). The *hard* boundaries stay in the DB:
  `manage_users`/role changes (guard trigger, admin-only) and the pending write-lockout (RLS).
- Default seed: storekeeper = capture/transfer/stock_in/stock_out/edit_entry/export_data;
  manager = all 10; admin = all 10.

### Auth flow
Login (`/login`) or self-signup (`/signup`) → `handle_new_user` creates a **pending** profile →
`ProtectedRoute` shows the **PendingApprovalScreen** until an admin assigns a real role on the
**Users** screen (`/users`, admin-only, reached from **More → Team → Manage users**). Supabase
persists the session; sign out from **More → Account**.

---

## 7. Stock model (live-count)

`entries.qty` is the **single source of truth** for on-hand quantity at a (item, shelf). The
`transfers` and `movements` tables are **immutable audit logs**. Every action both logs a row **and**
mutates the live entry:

- **Capture** → creates an entry (opening qty).
- **Transfer (STN)** → logs a transfer, decrements the source entry, creates/updates the dest entry.
- **Stock IN (GRN)** → logs a movement, adds qty to the entry (or creates it).
- **Stock OUT (MIR)** → logs a movement (with `available_qty`), subtracts qty (floored at 0).
  Over-issue is confirmed + flagged as a **discrepancy** (`qty > available_qty`); managers see these +
  empty locations (qty 0) in the Dashboard **Alerts** panel.

"Running stock" therefore = sum of `entries.qty`. Matching an item across logs/entries uses
`master_code ?? assigned_code ?? name` (see `lib/itemDetail.ts`, `lib/transferMatch.ts`).

---

## 8. Row-Level Security (current, after all migrations)

All data tables have RLS enabled. `current_user_role()` reads the caller's role.

| Table | Read | Write |
|-------|------|-------|
| `profiles` | any authenticated | update own row or admin; **role change → admin only (guard trigger)** |
| `zones` | authenticated | admin |
| `master_items` | authenticated | admin or manager |
| `entries` | authenticated | insert: `created_by = auth.uid()` **and role ≠ pending** (0012); update/delete: manager/admin or owner |
| `transfers` | authenticated | insert: `created_by = auth.uid()` **and role ≠ pending** (0012) |
| `movements` | authenticated | insert: `created_by = auth.uid()` **and role ≠ pending** (0012) |
| `app_settings` | authenticated | update: admin |
| `role_permissions` | authenticated | all: admin |

> Note: **reads** are open to any authenticated user (including pending) — the pending lockout is on
> writes + UI. Tightening reads was deliberately deferred (low value, more churn).

---

## 9. Migrations (0001–0014)

| # | What it does |
|---|--------------|
| 0001 | Core schema: enums, zones, master_items, profiles, entries, transfers, movements, sequences, `running_stock`, RLS, `handle_new_user` |
| 0002 | `zones.purpose` column |
| 0003 | `master_items.sku` (ERP code) + index |
| 0004 | `entries` DELETE policy (manager/admin or owner) |
| 0005 | `profiles.manager_password_hash` + set/verify RPCs — **now dead/unused** |
| 0006 | Hardened `handle_new_user` (search_path, schema-qualified, idempotent) |
| 0007 | `item_code_seq` restart at 4845 (master re-seeded to ITM-04844) |
| 0008 | `master_items.section` (13 home-areas) + index |
| 0009 | `app_settings` table (shared edit-lock window) + RLS |
| 0010 | Inventory: simplify `running_stock`, `movements.available_qty`, `next_grn_number`/`next_mir_number` |
| 0011 | Add `pending` to `user_role` enum (own migration) |
| 0012 | Default new signups to `pending`; `guard_role_change` trigger; pending write-lockout RLS |
| 0013 | `role_permissions` table + RLS + default seed |
| 0014 | `shelves` table — 612-shelf physical registry (Z01–Z06); used for "known shelf" checks and coverage cards |

Seeds: `supabase/seed/zones.sql` (11 zones), `master_items.sql` (catalogue), `master_enrichment.sql`
(category+section). Master rebuild script: `supabase/seed/build-master.mjs`.

---

## 10. Key conventions / invariants

- **Shelf code** `Z<zone>-<F><seq>` regex `^Z(\d+)-([SGPR])(\d+)$/i`; normalize uppercase; pad seq to 3
  for display. Scanning `Z3-S042` auto-sets zone `Z03` (pad zone to 2).
- **Scan-only** zone/shelf inputs in Capture/Edit/Transfer/Stock; manager **manual-entry mode**
  (session-only, per-device) unlocks typing.
- **Edit-lock**: entries lock for editing N hours after `created_at` (default 24, configurable in
  Settings, stored in `app_settings`). Client-side UX gate only — not in RLS.
- **Numbers**: STN/GRN/MIR are `…/YYYY-MM/NNNN` from server sequences (monotonic).
- **Devanagari**: UTF-8 everywhere; CSV exports prepend a BOM so Excel reads Hindi.
- **`src/types/database.ts` is UTF-16** (generated). New tables/enums are hand-added there so the app
  compiles before the owner regenerates; the owner runs all `supabase db push` / `gen types`.

---

## 11. Running & deploying

```bash
npm install
npm run dev                 # local dev (http://localhost:5173)
npm run build               # production build (Netlify runs this)
npx tsc --noEmit            # typecheck
npx vitest run              # tests (85)
```

**Deploy flow** (owner does the DB + push; secrets never leave the owner):
```bash
npx supabase db push        # apply new migrations to the linked project
git push                    # → Netlify auto-builds & deploys main
```
The app reads only the Supabase **anon key** (`.env.local`). DB password / service_role / access token
stay with the owner.

---

## 12. Known gaps / things to watch (useful when debugging)

- **`manager_password` (0005) is dead code** — never wired; the role model replaced it. Harmless.
- **Permissions are UI-enforced only.** A determined authenticated user could call the API directly
  for a workflow action they lack in the UI. Hard security (pending lockout, role changes) is in RLS.
- **Pending users can still READ** all data via the API (writes are blocked). Reads weren't tightened.
- **`running_stock` view** is now a plain sum of `entries.qty`; the Stock-levels UI computes its own
  rollup client-side (includes NEW items). Keep both in mind if stock numbers ever look off.
- **`zones` table is never queried** — zone data is served client-side from `src/constants/zones.ts`.
  The `shelves` table (0014) IS queried via `useShelves`.
- **Zone names Z01–Z06 are still placeholders** (RAW-MATERIALS, etc.) pending the real names.
- **No offline mode** — the app needs connectivity; camera scanning needs HTTPS (Netlify) or localhost.
- **Photos** are in Supabase Storage bucket `entry-photos` (URLs on `entries.photo_url`); bucket
  was created manually in the live project on 2026-06-26 (no migration; a fresh environment must
  recreate it). CSV export does not bundle photos. A Storage failure on upload aborts the whole entry
  save (hardening candidate).
- **Barcodes screen has two tabs**: *Item barcodes* (`src/screens/Barcodes/ItemBarcodes.tsx`) with
  zone filter chips (counts via `lib/barcodeZones.ts` `zonesPresent()`), bulk assign, and PDF
  download; *Shelf labels* (`ShelfCoverage` + `ShelfLabels`) for zone reprint. Selection persists
  across zone-filter changes — the PDF download draws from all selected entries regardless of the
  active zone filter.
