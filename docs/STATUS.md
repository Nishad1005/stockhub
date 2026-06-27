# StockHub v0.2 — Status & Getting Started

_Last updated: 2026-06-28_

A plain-language snapshot of **what's built, what works, how to run it, and
what's next.** For the phased plan and acceptance criteria see
[`BUILD.md`](../BUILD.md); for architecture rules see [`CLAUDE.md`](../CLAUDE.md).

---

## 1. Where the app lives

| Thing | Where |
|-------|-------|
| **Live web app** | Netlify (auto-deploys on every push to `main`) |
| **Source of truth** | GitHub → branch `main` |
| **Database / auth / storage** | Supabase project `ocqfpmealzautpsvxuij` |
| **The v0.1 spec** | `legacy/UM_Designs_StockHub.html` (read-only reference) |

**How a change reaches the phone:** edit code → commit → `git push` →
Netlify rebuilds (~1–2 min) → hard-refresh the site on the phone.

> **Camera needs HTTPS.** Barcode/photo scanning only works over `https://`
> (Netlify) or `http://localhost`. It will **not** work over a `http://192.168.x.x`
> LAN address — so test scanning on the **Netlify URL**, not the local-network IP.

---

## 2. What works today ✅

**Auth & accounts**
- Email/password login plus **self sign-up** — new accounts land in a `pending`
  state and see a "waiting for approval" screen until an admin approves them.
- Roles: pending / storekeeper / manager / admin. Sessions persist across reloads.
- **10 granular permissions** (capture, transfer, stock_in/out, edit/delete entry,
  export, unlock, change_settings, view_alerts) are configurable per role by an admin.

**Navigation — 6-tab bottom bar**
The deployed app uses a **6-tab** bottom navigation:

`Capture · Items · Movements · Find · Barcodes · More`

- **Movements** is a hub with a `Transfers | Stock` toggle — Transfers and Stock IN/OUT
  live under it. Old links `/transfers` and `/stock` redirect to `/movements`.
- **More** is the renamed Settings screen at `/more` (`/settings` redirects to `/more`).
- **Barcodes** keeps its own dedicated tab.
- Admin-only **Users** screen is reached from More → Team.

**Capture** (`/capture`) — record that an item exists at a location
- **Scan a shelf label** (`Z1-S001`) → shelf is set and the **zone auto-fills** (`Z01`).
- Shelf stays **sticky** for the next entries; Clear to change it.
- **Scan an item label** (`ITM-…`) → looks it up in the master, pre-fills the
  name, and shows a **MATCHED / SCANNED / NEW** badge + home area. Unknown codes are
  kept as a scanned barcode and you type the name.
- Type-ahead search on the item name (4+ chars) with home area shown per suggestion.
- Fields: name, definition, category, qty, notes, optional **photo** (compressed before upload).
- "Not a registered shelf" warning when a code isn't in the 612-shelf registry.
- Manager "manual entry mode" unlocks typing the shelf instead of scanning.
- USB/Bluetooth scanners work anywhere on the screen too.

**Items** (`/items`) — the captured stock list
- Newest-first list with thumbnail, code badge (existing / assigned / NEW), shelf, zone, qty.
- Filters: status chips (existing / NEW), zone chips, section (home area) filter.
- Tap a row → **Item Detail** modal: total qty on hand, per-shelf locations, recent
  activity, and one-tap pre-filled actions (Stock IN, Move, Out, Edit).
- Edit all fields or delete (two-step). Entries lock 24 h after capture (configurable 1–168 h);
  manager can unlock for the current session only.

**Movements** (`/movements`) — transfers and stock IN/OUT
- **Transfers tab**: shelf→shelf move with a server-sequenced **STN number**
  (`STN/YYYY-MM/NNNN`). Shows today/this-week/total stats and a tappable transfer list.
- **Stock tab**: **Stock IN** (server GRN number, qty goes up) and **Stock OUT**
  (server MIR number, qty goes down; over-issuing is recorded as a discrepancy).
  Two sub-tabs: Stock levels (live per-shelf qty) and History (every IN/OUT, filterable).

**Find** (`/dashboard`, tab labelled "Find") — the lookup surface
- **"Where is this item?"** — type or scan → shows which shelf(s) it's on, grouped by shelf.
- Overview cards: items-by-zone bars, NEW-vs-existing split, fullest shelves, recent captures.
- **Alerts panel** (managers): empty locations and recent discrepancies.

**Barcodes** (`/barcodes`) — codes and labels
The screen has a **two-tab toggle**:
- **Item barcodes** tab: zone filter chips to narrow the list; assign `ITM-#####` codes
  server-side (`ITM-04845…`, no master collisions), single or bulk; download item labels
  as a **100×50 mm PDF** (CODE128).
- **Shelf labels** tab: registered-shelves coverage card per zone, plus zone reprint — a
  PDF of that zone's shelf barcodes that matches the already-printed physical labels.

**More** (`/more`, formerly Settings) — exports, controls, account
- Exports (CSV with BOM for Hindi/Devanagari), edit-lock window selector, manual-entry-mode
  toggle, data counts (including photo count), About, Account/Sign-out, and admin Team link.

**Users** (`/users`, admin only)
- Pending approvals (approve + assign role), all-users role management, and the per-role
  permission matrix (10 abilities, editable for storekeeper and manager).

**Design system**
A shared component layer (`src/components/ui/`) — Button, Badge, Chip, Card, Field,
ScreenHeader, SearchField, Modal — with lucide icons and the chocolate `brand-*` palette,
applied consistently across all screens.

**The master catalog**
- **4,877 items** (4,561 base + 316 June append) loaded once and cached. Each item carries
  a cleaned **6-value category** (Raw Material, Hardware, Consumable, Packaging, Asset,
  Finished Goods) and one of **13 home sections** (Foam & Cushioning, Upholstery & Fabric,
  Metal Components, …). The factory ERP code is in `sku`; scans match on either the
  StockHub code or the ERP code.

**Photos**
- The `entry-photos` Supabase Storage bucket was created in the live project (2026-06-26).
  Photo-attached captures save end-to-end; thumbnails display in the Items list and
  full-size in the edit modal.

**Tests**
- **85 passing** Vitest unit tests covering edit-lock, stock levels, transfer matching,
  permissions, master search, CSV, shelf registry, validators, and design-system class maps.

---

## 3. Not built yet ⬜ (the road ahead)

| Next up | What it adds |
|---------|--------------|
| **Real zone names** (cosmetic) | Replace placeholder names in `src/constants/zones.ts` with real factory area names. Known so far: Z2 Fabric, Z3 Foam Dep., Z4 Wood, Z5 Packaging-Racks, Z6 Packaging-Shelves; Z01's real name is still a placeholder. |
| **Inventory / GRN module** | Supplier deliveries, running stock = opening capture ± all movements. |
| **Native iOS / Android** (Capacitor) | Capacitor is scaffolded but parked; the app is browser-only today. Includes native MLKit barcode scanning. |
| **Offline-first** | Capture with no internet (SQLite mirror); sync when back online. |
| **iOS / Android store builds** | TestFlight + Play Store internal testing. |

---

## 4. Run it locally (for development)

Prereqs: **Node 20+**, and a `.env.local` with the Supabase URL + anon key
(copy from `.env.example`; the anon key is safe to share — never the DB password
or service-role key).

```bash
npm install          # first time only
npm run dev          # http://localhost:5173
```

Other useful scripts:

| Command | What it does |
|---------|--------------|
| `npm run build` | Type-check + production build to `dist/` (what Netlify runs) |
| `npm run test`  | Unit tests (Vitest) — currently 85 passing |
| `npm run typecheck` | TypeScript only, no build |
| `npm run lint` / `npm run format` | ESLint / Prettier |

---

## 5. Database changes (done by the project owner)

The DB password / service-role key never go through the assistant. The owner runs
these in the **Supabase dashboard → SQL Editor** (or via the CLI):

1. **Migrations** in `supabase/migrations/` (numbered `0001…0014`) — schema, RLS,
   the item-code sequence, `section` column, permissions matrix, shelf registry, and more.
2. **Seeds** in `supabase/seed/` — zones, the 4,877-item master (4,561 base +
   316 June append), and `master_enrichment.sql` (the 6-category + 13-section classification).
3. After a schema change: regenerate types →
   `npx supabase gen types typescript --linked > src/types/database.ts`.

> **All of the above is already applied** for the current build, including migrations
> `0001`–`0014` and the master + enrichment seed.
>
> The **`entry-photos`** Storage bucket is not created by any migration — it is an
> owner-provisioned step. A fresh environment must recreate it (public, authenticated-insert
> + public-read) for photo capture to work.

---

## 6. Quick smoke test (phone, on the Netlify URL)

1. Log in.
2. **Capture** → Scan a shelf label → zone auto-fills.
3. Scan an `ITM-…` item label → MATCHED + home area → add qty → **Save**.
4. **Items** → new entry on top; tap it → Item Detail shows shelf, qty, actions.
5. **Movements → Transfers** → create a shelf-to-shelf transfer → confirm STN number.
6. **Movements → Stock** → Stock IN on an item → qty goes up.
7. **Find** → search an item → see its shelf.
8. **Barcodes → Item barcodes** → use zone chips to filter; download a label → confirm
   full-size PDF. Switch to **Shelf labels** → reprint a zone's shelf labels.
9. **More** → confirm exports, edit-lock settings, and sign-out work.

---

_When in doubt, the v0.1 HTML is the spec — match it, don't redesign._
