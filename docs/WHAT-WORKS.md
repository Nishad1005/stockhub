# StockHub v0.2 — What's Built & Working

A complete, verified capabilities reference for the **deployed** app. Everything
below was confirmed against source on `main` @ `bc83f6f` (the commit Netlify serves)
during the ground-truth audit — see `docs/BUILD-STATUS-ACTUAL.md` for the evidence
and line-number citations. This document is the positive companion: it describes the
working product as a user and a developer experience it today.

Where a capability has a real-world dependency the code can't self-verify (a Supabase
bucket, an applied migration), it is called out inline so this stays trustworthy.

---

## 1. What it is

**U&M Designs StockHub v0.2** is a mobile-first **warehouse stock-management web app**
for the Store Tanawada warehouse (U&M Designs, Jodhpur). A storekeeper opens it in a
phone browser, scans a shelf barcode, and records what stock sits where. It tracks
captures, shelf-to-shelf transfers, and stock receive/issue, all against a 4,877-item
catalogue, with role-based access and audit trails.

- **Frontend:** React 18 + TypeScript + Vite, Tailwind (chocolate design system), deployed on **Netlify** (auto-builds `main`).
- **Backend:** **Supabase** — Postgres + Auth + Storage + Row-Level Security.
- **Live data path:** every feature reads/writes Supabase through typed TanStack Query hooks.

---

## 2. Getting in & getting around

### Accounts & onboarding (working)
- **Email/password login** (`/login`).
- **Self sign-up** (`/signup`) creates a new account that lands in a **`pending`** state.
- A **"waiting for approval" screen** shows for pending users until an admin approves them (rendered automatically by the route guard whenever the signed-in user's role is `pending`).
- Session is restored on reload; a splash shows while auth/profile load.

### Navigation (working — 7-tab bottom bar)
The deployed app uses a **7-tab** bottom navigation:

`Capture · Items · Transfers · Stock · Find · Barcodes · Settings`

(Plus an admin-only **Users** screen reached from Settings → Team.) Each tab maps to a
real route and screen; the active tab shows a tan pill with a lucide icon.

> Note: a separate 5-tab redesign (Movements hub + More) exists on an **unmerged** branch
> and is **not** what's live. This doc describes the deployed 7-tab app.

---

## 3. Roles & permissions (working)

Four roles: **pending**, **storekeeper**, **manager**, **admin**.

- **pending** — no app access; cannot write anything (blocked in the database, not just the UI).
- **storekeeper / manager / admin** — working roles. **admin** always has every permission and can manage users and the permission matrix.

**Ten granular permissions** drive which actions appear (exact keys + labels from `src/constants/permissions.ts`):

| Key | What it unlocks |
|-----|-----------------|
| `capture` | Capture items |
| `transfer` | Transfer stock (Move) |
| `stock_in` | Stock IN (receive) |
| `stock_out` | Stock OUT (issue) |
| `edit_entry` | Edit entries |
| `delete_entry` | Delete entries |
| `export_data` | Export CSV |
| `unlock_entry` | Unlock locked entries |
| `change_settings` | Change access / edit-lock settings |
| `view_alerts` | See the manager Alerts panel |

- Grants live in the `role_permissions` table; an admin ticks the matrix per role on the Users screen (`storekeeper` and `manager` are editable; `admin` is locked to full, `pending` to none).
- Resolved everywhere via `usePermissions().can(key)` — admin → always true, pending/none → always false, otherwise the granted set.
- **Hard boundaries are in the database**, not just the UI: pending users are write-locked by RLS, and a Postgres trigger blocks anyone but an admin from changing a role.

---

## 4. Feature by feature — everything that works

### Capture (`/capture`) — the main daily job
The primary data-entry surface. End-to-end working:

- **Set a shelf** three ways: **camera scan** (phone camera via html5-qrcode), **USB/Bluetooth scanner** (keystroke-timed detection), or **manual typing** when a manager flips on manual-entry mode (a session-only, per-device override).
- **Zone auto-derives** from the shelf code (scanning `Z3-S042` sets zone `Z03`), and the **shelf stays "sticky"** so several items can be logged to it in a row.
- **"Not a registered shelf" warning** when a scanned code isn't in the 612-shelf registry.
- **Item entry** with a **master typeahead** (type 4+ chars → ranked matches from the 4,877-item catalogue) or **scan a printed item label**. A status badge shows **MATCHED / SCANNED / NEW**, and the item's "home area" (section) is surfaced when known.
- **Fields:** name, definition, category (pre-filled from the zone), quantity, notes, and an optional **photo**.
- **Photo:** snap with the camera or pick from the gallery; it's compressed on-device (max 1024×1024, JPEG) and uploaded to Supabase Storage, with the URL saved on the entry. The photo is **optional**. *(Dependency: requires the `entry-photos` Storage bucket to exist in the Supabase project — an owner-provisioned step.)*
- On save the item is written to Supabase and the form resets for the next item (keeping the sticky shelf and category).

### Items (`/items`) — browse, edit, delete
- Lists everything captured, **newest first**, with a **photo thumbnail**, the item code (or "NEW"), shelf/zone, and quantity.
- **Filters:** status chips (existing / NEW), zone chips, and a "home area" (section) filter, with live counts.
- Tap a row → **Item Detail** (below). **Edit** any field or **delete** via the edit modal.
- **Edit-lock:** entries lock for editing a configurable number of hours after capture (default 24h; options 1/6/12/24/48/168h). Locked rows show a lock icon; a manager can unlock an entry for the current session.

### Item Detail (modal) — one-tap actions
Opened from Items, from Find, and from Stock levels. Shows:
- The item's code, name, **total quantity on hand** across shelves, **every shelf it sits on** (with per-shelf qty), and **recent activity** (stock IN/OUT + transfers).
- **One-tap, pre-filled actions** (permission-gated, no re-typing): **Stock IN**, and per shelf row **Move** / **Out** / **Edit**.

### Transfers (`/transfers`) — shelf → shelf with an STN
- Record a move: pick the item, scan the **From** shelf, scan the **To** shelf, enter quantity (a banner shows on-hand at the source), save.
- Generates a server-sequenced **STN number** (`STN/YYYY-MM/NNNN`), logs the transfer, and updates the live entry quantities.
- The Transfers screen shows today/this-week/total stats and a tappable list; each transfer opens a detail view.

### Stock IN / OUT (`/stock`) — receive & issue
- **Stock IN** → server **GRN number**, quantity goes up. **Stock OUT** → server **MIR number**, quantity goes down (floored at 0).
- **Over-issuing** more than the system shows is confirmed and recorded as a **discrepancy** (the available quantity at the time is stored on the movement).
- Two tabs: **Stock levels** (per item, by shelf, computed live) and **History** (every IN/OUT, filterable to discrepancies).

### Find / Dashboard (`/dashboard`, tab "Find") — locate + overview
- **"Where is this item?"** — type or scan; matches captured items by name/code and groups results by shelf with quantities, each tappable into Item Detail.
- **Overview cards:** items-by-zone bars, **NEW vs existing** split, **fullest shelves**, and **recent captures**.
- **Alerts panel** (managers, gated by `view_alerts`): **empty locations** and **recent discrepancies**.

### Barcodes (`/barcodes`) — codes & labels
- **Assign `ITM-#####` codes** to NEW items (server sequence starting at 4845 to avoid catalogue collisions); single or bulk.
- **Download item labels** as PDF (100×50mm, CODE128).
- **Reprint shelf labels** — pick a zone → a PDF of that zone's shelf barcodes that matches the already-printed physical labels (a drop-in reprint).
- **Registered-shelves coverage** card showing how many shelves are loaded per zone. *(Depends on migration `0014_shelves` being applied in the live DB.)*

### Settings (`/settings`) — exports, controls, account
- **Exports** (gated by `export_data`): entries and transfers as **CSV**, Excel-friendly with a BOM so Hindi/Devanagari renders correctly.
- **Access Controls** (gated by `change_settings`): the **edit-lock window** selector and the **manual-entry-mode** toggle.
- **Data / Master Data:** counts and catalogue summary (including how many entries have photos).
- **About** and **Account** (email, role, **Sign out**).
- **Team** (admin): a link to **Manage users**.

### Users (`/users`) — admin only
- **Pending approvals:** approve each new signup and assign a role.
- **All users:** change anyone's role (your own is disabled, to prevent lockout).
- **Role permissions:** the per-role matrix — tick exactly which of the 10 abilities `storekeeper` and `manager` have.

---

## 5. Data model — the tables that are live

Postgres on Supabase (migrations `0001`–`0014` are the source of truth). The app actively reads/writes:

| Table | Holds | App use |
|-------|-------|---------|
| `entries` | captured stock — **`qty` is the live source of truth per (item, shelf)** | full CRUD; every capture/transfer/movement touches it |
| `master_items` | the **4,877-item catalogue** (`ITM-#####`; factory ERP code in `sku`; 6-category + 13-section taxonomy) | read for typeahead + code lookup |
| `transfers` | STN-tracked shelf→shelf moves (immutable audit log) | list + insert |
| `movements` | Stock IN/OUT ledger with GRN/MIR refs + `available_qty` for discrepancies | list + insert |
| `profiles` | one per auth user; holds `role` | read; admin updates role |
| `app_settings` | single shared row (edit-lock window) | read + manager update |
| `role_permissions` | granular per-role grants | read + admin edit |
| `shelves` | the **612 physical shelves** registry (Z01–Z06) | read for "known shelf" checks |

- **Enums:** `fixture_type (S,G,P,R)`, `user_role (storekeeper, manager, admin, pending)`, `movement_type (IN, OUT)`.
- **Server sequences:** `stn_seq`, `grn_seq`, `mir_seq` (monotonic note numbers) and `item_code_seq` (new ITM codes).
- **Storage:** photos go to the `entry-photos` bucket.

### The stock model (live-count)
`entries.qty` is the truth. `transfers` and `movements` are immutable logs. Every action
**both** writes a log row **and** mutates the live entry: capture sets the opening qty, a
transfer decrements the source and updates the destination, IN adds, OUT subtracts (floored
at 0). "Running stock" = sum of `entries.qty`. Item identity across logs uses
`master_code ?? assigned_code ?? name`.

---

## 6. Scanning & barcodes (how it actually works)

- **Camera scanning** uses html5-qrcode and supports CODE_128, CODE_39, QR, EAN-13/8, UPC-A. It needs a **secure context** (HTTPS, which Netlify provides, or localhost); on plain-http it warns and falls back to manual.
- **USB/Bluetooth scanners** are detected by keystroke timing (fast keystrokes terminated by Enter that match the shelf pattern) and feed the same shelf-apply path as the camera.
- **Shelf codes:** `Z<zone>-<F><seq>` (e.g. `Z2-G005`), normalized to uppercase, sequence padded to 3 for display; fixtures are S shelf, G ghoda, P pallet, R rack.
- **Item labels** encode the StockHub `ITM-#####` code (with the factory ERP `sku` as a fallback match). **Shelf labels** are regenerated to match the existing printed set.

---

## 7. Tech stack (working set)

| Layer | Choice |
|-------|--------|
| Framework / bundler | React 18 + TypeScript, Vite |
| Styling | Tailwind CSS + a shared `src/components/ui/` design system (chocolate `brand-*` tokens), lucide icons |
| Global client state | Zustand (`auth`, `session`, `captureSession`, `toast`) |
| Server state | TanStack Query v5 (every data hook) |
| Routing | React Router v6 |
| Validation | Zod (`src/lib/validators/`) |
| Backend | Supabase (Postgres + Auth + Storage + RLS) |
| Scan / barcodes / labels | html5-qrcode (scan), JsBarcode (render), jsPDF + autotable (labels) |
| Dates | date-fns |
| Tests | Vitest (83 passing) |
| Hosting | Netlify |

The UI is a single shared design-system layer: `Button`, `Card`, `Badge`, `Chip`,
`Field` (Input/Label), `ScreenHeader`, `SearchField`, `Modal`, and a central icon module —
used consistently across all screens.

---

## 8. Working details worth knowing

- **Consistent feedback:** all actions toast success/failure; validation failures warn, system errors error. No `alert()`/`confirm()` except the deliberate over-issue confirmation.
- **Permission-aware UI:** buttons appear only for granted actions; the underlying hard limits are enforced in the database.
- **CSV exports** prepend a BOM so Excel renders Hindi correctly.
- **Note numbers** (STN/GRN/MIR) are generated server-side, so they stay monotonic per month even with multiple devices.
- **Edit-lock** derives from an entry's creation time (editing doesn't extend it) and is a client-side UX gate; the window is configurable warehouse-wide.
- **Tested logic:** the pure logic (edit-lock, stock levels, transfer matching, permissions, master search, CSV, shelf registry, validators, design-system class maps) is covered by 83 passing Vitest unit tests.

---

## 9. Not part of the working set (so this list stays honest)

These are referenced somewhere but are **not** live capabilities today:

- **5-tab "Movements hub + More" navigation** — built on the unmerged `feat/nav-redesign` branch; the deployed app is the 7-tab layout above.
- **ManagerUnlock component + `manager_password` (migration 0005)** — dead code, imported by nothing; the real manager override is the manual-entry-mode toggle.
- **Native iOS / Android apps (Capacitor)** — scaffolded but parked; the app is browser-only.
- **Offline-first (SQLite mirror + sync)** — not built; the app needs connectivity.
- **`zones` table and the `running_stock` view** exist in the database but the app doesn't query them (zone data is served from a client-side constant; stock levels are rolled up client-side).

### Real-world dependencies to confirm on the live project
The code is correct, but these owner-run steps can't be verified from source — confirm them on the deployed environment:
- The **`entry-photos` Storage bucket** exists (else photo capture fails at save).
- Migrations **0001–0014** are applied (else features on later tables — permissions matrix, shelf registry, discrepancies — won't work).
- The **master catalogue + June append** are loaded (`select count(*) from master_items` should be ~4,877).

---

End of capabilities reference. Companion: `docs/BUILD-STATUS-ACTUAL.md` (the audit with
per-claim status and line-number evidence).
