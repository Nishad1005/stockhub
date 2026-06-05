# CLAUDE.md — StockHub v0.2

You are working on **U&M Designs StockHub v0.2**: a warehouse stock-management
app for U&M Designs Pvt Ltd (furniture/upholstery, Jodhpur). This file is the
context you load on every session. Read it before touching any code.

---

## 1. The mission

Port the working v0.1 prototype (`legacy/UM_Designs_StockHub.html` — a single
2,778-line HTML file) into a production-grade web app + iOS app + Android app.

**v0.1 IS THE SPEC.** Every UX detail, validation rule, edge case is already
solved there. Your job is to re-implement, not redesign. When in doubt, open
the HTML file and search for the relevant code. Do not invent new behavior.

---

## 2. Tech stack (locked — do not propose alternatives)

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend framework | **React 18 + TypeScript** | Industry standard, native to Capacitor |
| Bundler | **Vite 5** | Fast HMR, minimal config |
| Styling | **Tailwind CSS** + custom design tokens | Chocolate palette preserved as CSS vars |
| State | **Zustand** | Lighter than Redux, no boilerplate |
| Server state | **TanStack Query (React Query) v5** | Caching, sync, optimistic updates |
| Routing | **React Router v6** | Standard, file-based-ish |
| Forms | Plain controlled inputs + **Zod** for validation | Avoid form-library complexity |
| Backend | **Supabase** (Postgres + Auth + Storage + Realtime) | Batteries-included, free tier |
| Native wrap | **Capacitor 6** | iOS + Android from same codebase |
| Camera/barcode | **`@capacitor-mlkit/barcode-scanning`** (native), `html5-qrcode` (web fallback) | Best-in-class on each platform |
| Local DB (offline) | **`@capacitor-community/sqlite`** | Mirrors Supabase tables for offline-first |
| Charts | **Recharts** | For Dashboard |
| Barcode rendering | **JsBarcode** | Already used in v0.1, keep |
| PDF generation | **jsPDF** + `jspdf-autotable` | Item labels, exports |
| Date utils | **date-fns** | Tree-shakeable, modern |
| Tests | **Vitest** + **Playwright** | Unit + e2e |
| Lint | **ESLint** + **Prettier** | Standard configs |
| Web hosting | **Netlify** | Keep existing deploy |
| iOS distribution | TestFlight → App Store | |
| Android distribution | Internal Testing → Play Store | |

**Do not** introduce new libraries without updating this file and asking first.

---

## 3. Project layout

```
stockhub-v0.2/
├── CLAUDE.md                    ← you are here
├── BUILD.md                     ← phased build plan, current status
├── README.md                    ← human-facing quick start
├── package.json
├── tsconfig.json / vite.config.ts / tailwind.config.ts / capacitor.config.ts
├── index.html                   ← Vite entry
├── .env.example                 ← copy to .env.local
├── src/
│   ├── main.tsx                 ← React root
│   ├── App.tsx                  ← Router + providers
│   ├── styles/globals.css       ← Tailwind + design tokens
│   ├── types/                   ← Shared TypeScript types
│   ├── constants/               ← Zones, shelf regex, brand colors
│   ├── lib/                     ← Supabase client, utils, validators
│   ├── stores/                  ← Zustand stores (auth, capture session)
│   ├── hooks/                   ← React hooks (useEntries, useTransfers, ...)
│   ├── components/              ← Reusable UI (Button, Modal, Toast, ...)
│   └── screens/                 ← One folder per route (Capture/, Items/, ...)
├── supabase/
│   ├── migrations/              ← SQL migrations (numbered)
│   └── seed/                    ← Seed data (zones, master)
├── docs/
│   ├── architecture.md
│   ├── deployment.md
│   ├── migration/               ← Per-screen migration specs from v0.1
│   └── decisions/               ← ADRs (Architecture Decision Records)
├── legacy/
│   └── UM_Designs_StockHub.html ← v0.1 — read-only reference, do NOT edit
├── ios/                         ← Capacitor-generated, do not edit manually
└── android/                     ← Capacitor-generated, do not edit manually
```

---

## 4. Domain glossary (memorize this)

| Term | Meaning |
|------|---------|
| **Zone** | A physical area of the warehouse, coded Z01–Z11 |
| **Shelf** | A specific bin within a zone. Code format: `Z<digit>-<F><nnn>` |
| **Fixture type** (`F`) | One letter: `S` shelf, `G` ghoda, `P` pallet, `R` rack |
| **Ghoda** | Hindi for "horse" — a free-standing fabric/upholstery rack |
| **Master** | The 4,561-item item-master (re-seeded from the factory Stock_Analysis CSV). Each item has a StockHub code like `ITM-00042`; its factory ERP code is in `sku` |
| **Capture** | Recording that an item exists at a location (discovery / audit) |
| **Transfer** | Moving stock between two shelves with an STN (Stock Transfer Note) |
| **Credit** | Stock IN — receiving stock at a location (planned for Ship 2) |
| **Debit** | Stock OUT — issuing stock from a location (planned for Ship 2) |
| **STN** | Stock Transfer Note number, format `STN/YYYY-MM/NNNN` |
| **GRN** | Goods Receipt Note — supplier delivery (planned for inventory module) |
| **MIR** | Material Issue Requisition — internal stock issue |
| **Store Tanawada** | The single warehouse location currently in scope |
| **NSO** | New Storekeeper Onboarding |
| **CCS** | Cycle Count System |

---

## 5. Critical invariants (must not break)

### 5.1 Shelf-code regex
```typescript
export const SHELF_RE = /^Z(\d+)-([SGPR])(\d+)$/i;
```
- Case-insensitive on input, **always normalize to uppercase** on store
- Letters allowed: **only** S, G, P, R
- Zone digit: 1 or 2 digits (e.g., `Z1-S042` and `Z11-S001` are both valid)
- Sequence: 1+ digits, **always pad to 3** for display (`S5` → `S005`)

### 5.2 Zone-from-shelf derivation
Scanning `Z3-S042` MUST auto-set the active zone to `Z03`. Single-digit zone in
shelf code → zero-padded to 2 in zone code.

### 5.3 Edit-lock window
- Default: 24 hours from `entry.created_at`
- Configurable: 1h, 6h, 12h, 24h, 48h, 168h (7d)
- Manager override unlocks individual entries for the **current session only**
- Manual entry mode override also unlocks BUT resets on app reload

### 5.4 Scan-only enforcement
- Zone and shelf inputs in **Capture, Edit, and Transfer (source AND destination)** are scan-only by default
- Manager password unlocks typing for the current session
- USB scanner detection: keystrokes <80ms apart, terminated by Enter, matching shelf regex → treated as scan

### 5.5 Brand palette (chocolate)
```css
--ink: #2C1E0F;       /* dark chocolate — text, headers */
--ink-2: #3D2A18;     /* slightly lighter */
--accent: #C1A77D;    /* tan — buttons, accents */
--accent-2: #8B6B40;  /* darker tan */
--accent-soft: #EDE3D2; /* soft tan — backgrounds */
--cream: #F5EEE3;     /* page background */
--mute: #8C7659;      /* muted text */
--ok: #4F7942;        /* success green */
--warn: #C77B25;      /* warning orange */
--bad: #B33A3A;       /* error red */
--line: #E8DFD0;      /* dividers */
```
Configured in `tailwind.config.ts` as `colors.brand.*`. Never use raw hex in
components — always reference the token (`text-brand-ink`, `bg-brand-cream`).

### 5.6 Data model lock
Database schema in `supabase/migrations/0001_initial_schema.sql` is canonical.
Field names match the v0.1 entry shape exactly so the migration of localStorage
→ Supabase is mechanical, not interpretive.

---

## 6. Coding conventions

### Files
- `PascalCase.tsx` for components
- `camelCase.ts` for utils, hooks, constants
- `kebab-case.md` for docs
- One component per file (except tiny sub-components)

### Components
- Function components only, no classes
- Props interface named `<ComponentName>Props`, defined in same file
- Co-locate styles via Tailwind classes
- Hooks come from `src/hooks/`, not inline `useEffect` chains in screens

### State
- **Server state** → React Query (`useEntries`, `useTransfers`, ...)
- **Global client state** (auth, session shelf, manual-entry-mode) → Zustand
- **Local UI state** → `useState`
- Never put server data in Zustand or vice versa

### Imports
- Use the `@/` alias for `src/` (e.g., `import { Button } from '@/components/Button'`)
- Group: external → internal absolute → relative

### Async / errors
- All async ops use try/catch with toast feedback
- Validation errors → toast with `type: "warn"`, system errors → `type: "err"`
- Never `alert()` or `confirm()` — use the Modal component

### Don't do
- ❌ Don't fetch in components — use a hook
- ❌ Don't write CSS files — Tailwind only (exception: `globals.css`)
- ❌ Don't use `any` — use `unknown` and narrow
- ❌ Don't deep-mutate Zustand state — return new objects
- ❌ Don't add a dependency without justifying in `docs/decisions/`

---

## 7. Working with the legacy HTML

The v0.1 HTML in `legacy/` is the **executable spec**. When implementing any
feature:

1. **Open the HTML** and find the relevant code (use grep — function names are
   stable: `renderShelfState`, `openTransferModal`, etc.)
2. **Read it carefully** — the logic encodes many subtle decisions (e.g., sticky
   shelf, auto-zone-derive, USB scanner timing)
3. **Check the migration doc** in `docs/migration/` for that screen
4. **Port to React** — same behavior, idiomatic React/TS code
5. **Test by parity** — open v0.1 in one tab, v0.2 in another, do the same flow

If something in the HTML seems wrong, **ask the user before changing it.** The
HTML reflects real warehouse workflows and edge cases.

---

## 8. Common tasks — how to do them

### Add a new screen
1. Create `src/screens/<Name>/<Name>Screen.tsx`
2. Add route in `src/App.tsx`
3. Add tab in `src/components/TabBar.tsx`
4. Write migration doc in `docs/migration/<n>-<name>.md`

### Add a database table or column
1. Create `supabase/migrations/<n>_<description>.sql`
2. Run `npx supabase db push` locally
3. Regenerate types: `npx supabase gen types typescript --local > src/types/database.ts`
4. Update the relevant TanStack Query hook

### Add a new dependency
1. Justify in a new `docs/decisions/<n>-<title>.md`
2. `npm install <pkg>`
3. Update Tech Stack section above if it's load-bearing

### Build for iOS
```bash
npm run build
npx cap sync ios
npx cap open ios
# Then Archive → Distribute in Xcode
```

### Build for Android
```bash
npm run build
npx cap sync android
npx cap open android
# Then Generate Signed Bundle in Android Studio
```

### Deploy web
```bash
npm run build
# Drag `dist/` to Netlify, or push to main if CI is configured
```

---

## 9. Things you should NOT do without asking

- Change the shelf code regex
- Rename database columns
- Edit `legacy/UM_Designs_StockHub.html`
- Add a major new dependency
- Change the chocolate palette tokens
- Touch the Capacitor `ios/` or `android/` generated folders manually
- Make a feature stricter than v0.1 specifies (e.g., require qty if v0.1 doesn't)

---

## 10. Things you SHOULD do proactively

- Suggest tests for new code
- Flag accessibility issues (alt text, label associations, keyboard nav)
- Notice when a v0.1 feature is being ported that needs offline-first handling
- Update `BUILD.md` after completing a phase
- Add an ADR when making a non-obvious architectural choice
- Refactor when a component crosses ~200 lines

---

## 11. Domain-specific gotchas

1. **Devanagari text** — some labels and notes are Hindi. Always use UTF-8,
   never assume ASCII. The font stack in `globals.css` includes Noto Sans
   Devanagari.
2. **Photos** — captured photos can be large. Compress to ~500KB max before
   upload via Supabase Storage.
3. **Master codes** — the master now holds **4,561 items** (`ITM-00001`…`ITM-04844`,
   re-seeded from the factory Stock_Analysis CSV; v0.1's original ITM codes were
   preserved by name-match and new items appended). New items get codes starting
   at **`ITM-04845`**, assigned on the Barcodes screen. The factory ERP "Product
   Code" lives in `master_items.sku` (regenerate the seed via
   `supabase/seed/build-master.mjs` if the CSV is refreshed).
4. **Multi-device sync** — once a manager unlocks an entry, that override is
   per-device. Don't sync override state.
5. **STN numbers** — must be monotonic per month. Generate server-side via a
   Postgres sequence, not client-side.
6. **Edit-lock derives from `created_at`**, not last edited time. Editing
   doesn't extend the lock window.

---

End of CLAUDE.md. When in doubt, read `BUILD.md` for current phase status.
