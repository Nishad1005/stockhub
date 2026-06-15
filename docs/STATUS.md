# StockHub v0.2 — Status & Getting Started

_Last updated: 2026-06-15_

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

**Auth**
- Email/password login (accounts are admin-provisioned in Supabase — no public sign-up).
- Roles: storekeeper / manager / admin. Sessions persist across reloads.

**Capture** (📷 tab) — record that an item exists at a location
- **Scan a shelf label** (`Z1-S001`) → shelf is set and the **zone auto-fills** (`Z01`).
- Shelf stays **sticky** for the next entries; ✕ Clear to change it.
- **Scan an item label** (`ITM-…`) → looks it up in the master, pre-fills the
  name, and shows a green **MATCHED** badge + **🏠 Home area**. Unknown codes are
  kept as a scanned barcode and you type the name.
- Type-ahead search on the item name (4+ chars) with **🏠 home area** shown per suggestion.
- Fields: name, definition, category, qty, notes, photo (compressed before upload).
- Manager "manual entry mode" unlocks typing the shelf instead of scanning.
- USB scanners work anywhere on the screen too.

**Items** (📦 tab) — the captured stock list
- Newest-first list with thumbnail, code badge (existing / assigned / NEW), shelf, zone, qty.
- Filters: status (All / NEW / Existing), zone chips, and **All Areas** (home section).
- Each matched row shows its **🏠 home area**.
- Tap a row → **edit** all fields or **delete** (two-step). Entries lock 24 h after
  capture (configurable); manager can unlock for the session only.

**Find** (🔍 tab) — the lookup surface
- **"Where is this item?"** — type or scan → shows which shelf(s) it's on, grouped.
- Items-by-zone bars, NEW-vs-existing split, fullest shelves, recent captures.

**Barcodes** (🏷️ tab) — labels
- NEW items get a StockHub code assigned server-side (`ITM-04845…`, no master collisions).
- Coded items render a CODE128 barcode and export to a **100×50 mm PDF label**
  (full landscape — the earlier "half PDF" bug is fixed).

**The master catalog**
- **4,561 items** loaded once and cached. Each item carries a cleaned
  **6-value category** (Raw Material, Hardware, Consumable, Packaging, Asset,
  Finished Goods) and one of **13 home sections** (Foam & Cushioning,
  Upholstery & Fabric, Metal Components, …). The factory ERP code is in `sku`;
  printed item labels and scans match on either the StockHub code or the ERP code.

---

## 3. Not built yet ⬜ (the road ahead)

| Next up | What it adds |
|---------|--------------|
| **Real zone names** (cosmetic) | Replace placeholder Z01–Z11 names in `src/constants/zones.ts` with the real factory area names. |
| **Transfers + STN** | Move stock shelf→shelf with a Stock Transfer Note (`STN/2026-06/0001`). |
| **Settings / exports** | CSV/ZIP export, edit-lock window, manager-password change. |
| **Native scanner** (Capacitor MLKit) | Faster, more reliable scanning inside the iOS/Android apps. |
| **Offline-first** | Capture with no internet; sync when back online. |
| **Inventory (Credit/Debit)** | Running stock = opening capture ± movements. |
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
| `npm run test`  | Unit tests (Vitest) — currently 29 passing |
| `npm run typecheck` | TypeScript only, no build |
| `npm run lint` / `npm run format` | ESLint / Prettier |

---

## 5. Database changes (done by the project owner)

The DB password / service-role key never go through the assistant. The owner runs
these in the **Supabase dashboard → SQL Editor** (or via the CLI):

1. **Migrations** in `supabase/migrations/` (numbered `0001…0008`) — schema, RLS,
   the item-code sequence, and the `section` column.
2. **Seeds** in `supabase/seed/` — zones, the 4,561-item master, and
   `master_enrichment.sql` (the 6-category + 13-section classification).
3. After a schema change: regenerate types →
   `npx supabase gen types typescript --linked > src/types/database.ts`.

> **All of the above is already applied** for the current build, including the
> master enrichment (migration `0008` + `master_enrichment.sql`).

---

## 6. Quick smoke test (phone, on the Netlify URL)

1. Log in.
2. **Capture** → 📷 Scan a shelf label → zone auto-fills.
3. Scan an `ITM-…` item label → MATCHED + 🏠 home area → add qty → **Save**.
4. **Items** → new entry on top with 🏠 area; try the **All Areas** filter.
5. **Find** → search an item → see its shelf.
6. **Barcodes** → download a label → confirm full-size PDF.

---

_When in doubt, the v0.1 HTML is the spec — match it, don't redesign._
