# Shelf Barcode Integration (Frozen Set) — Design Spec

Status: **approved** · Date: 2026-06-25 · No DB schema change, no new deps.

---

## 1. Context & goal

The original developer made the warehouse's zone/shelf barcodes with an external (Claude) tool
and wants to **keep using those printed labels unchanged**. We confirmed:

- His labels use our exact format `Z<zone>-<F><seq>` (e.g. `Z2-G005`), CODE128.
- The set is **frozen** and covers **Z01–Z06 only**, totalling **612 shelves**.

Last session we already built the integration: the shelf regex accepts his codes, the camera reads
them, the **`shelves` registry** (migration `0014`) is seeded with his exact 612 codes, the
"known/unregistered" check is wired into Capture/Transfer/Stock, and in-app reprint regenerates his
identical labels.

**So the remaining work is verification + cleanup + visibility — not new plumbing.** The one action
that actually activates everything is applying migration `0014` to the live DB (owner's step).

## 2. Key behavioral fact

`useShelfChecker()` returns `false` for any code not in the `shelves` table. Therefore:

- **Before `0014` is applied** (empty table) → every scan shows "⚠ Not a registered shelf" (still
  scannable; just noisy/alarming).
- **After `0014` is applied** → all 612 of his codes return "✓ known"; warnings only appear for a
  genuine typo/foreign code.

## 3. Scope (what we build/change)

### 3.1 Owner action (out-of-band, the activation step)
Owner runs `npx supabase db push` to apply `0014_shelves.sql` (612 rows). The app already compiles
against hand-added types. **This is documented, not coded.**

### 3.2 Code/doc cleanup — correct stale label counts
`src/constants/shelf.ts` is the only stale source:
- line 7: *"The 703 already-printed physical labels assume this format."* → **612**, Z01–Z06.
- line 28: example *"Shelf 5 of 207"* → a real example (e.g. *"Shelf 5 of 116"*), since no fixture
  reaches 207 (max is Z01 S116 / Z05 R136 / Z06 S132).

(No other stale count exists in code/docs — verified by grep; the 703/612 hits in
`master_items.sql`/`master_enrichment.sql` are unrelated SKU strings.)

### 3.3 Admin "Shelves coverage" view (new, small)
A read-only card on the **Barcodes** screen showing per-zone registered counts + total, so an admin
can confirm his whole set is loaded at a glance — and immediately see if the migration hasn't been
applied (total 0).

- **`src/lib/shelvesCoverage.ts`** — pure helper:
  ```ts
  export interface ZoneCoverage { zoneCode: string; count: number; }
  export interface ShelvesCoverage { zones: ZoneCoverage[]; total: number; }
  export function shelvesCoverage(rows: ReadonlyArray<{ zone_code: string }>): ShelvesCoverage;
  ```
  Groups rows by `zone_code`, sorts by zone code ascending, `total = rows.length`.
- **`src/lib/shelvesCoverage.test.ts`** — unit tests (grouping, sort, total, empty → `{zones:[],total:0}`).
- **`src/screens/Barcodes/ShelfCoverage.tsx`** — uses `useShelves()`; renders a card:
  - loading → "Checking…"
  - `total === 0` → an amber note: "No shelves registered yet — apply migration 0014 (db push)."
  - else → per-zone chips `Z01 ✓ 116` … and a `612 total registered` footer.
  - Uses brand tokens only.
- Wire `<ShelfCoverage />` into `BarcodesScreen` (near the existing `<ShelfLabels />`).

### 3.4 Parity verification (no code; a check we run)
Confirm the seed's per-zone counts sum to 612 and match his label set:
`Z01 116 · Z02 48 (S37+G11) · Z03 118 (S96+P22) · Z04 62 · Z05 136 · Z06 132 = 612`.

## 4. Out of scope (YAGNI)

- Adding/editing/deleting shelves in-app, or any "import" path — the set is frozen.
- Changing the shelf regex, the `shelves` schema, or the reprint design.
- Zones Z07–Z11 (no physical labels exist).

## 5. Testing

- `npx tsc --noEmit` clean; `npm run build` green.
- `npx vitest run` — new `shelvesCoverage` tests pass; existing 67 stay green.
- Manual: on Barcodes, the coverage card shows the per-zone counts + 612 total when `0014` is applied,
  and the amber "apply migration" note when it isn't.

## 6. Files

| File | Change |
|------|--------|
| `src/constants/shelf.ts` | Fix stale "703"/"207" comments → 612 / real example |
| `src/lib/shelvesCoverage.ts` | New — pure grouping helper |
| `src/lib/shelvesCoverage.test.ts` | New — unit tests |
| `src/screens/Barcodes/ShelfCoverage.tsx` | New — coverage card |
| `src/screens/Barcodes/BarcodesScreen.tsx` | Render `<ShelfCoverage />` |
| `docs/PROJECT-OVERVIEW.md` (optional) | Note Z01–Z06 / 612 frozen set if helpful |
