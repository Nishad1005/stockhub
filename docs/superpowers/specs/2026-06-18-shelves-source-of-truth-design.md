# Shelves as Source of Truth — Design Spec

Status: **approved** · Date: 2026-06-18.

---

## 1. Goal

Make the app the authoritative registry of the warehouse's **612 shelves** (extracted verbatim from
the 6 physical zone label PDFs), use it to **warn** when a captured/transferred shelf isn't registered,
and let anyone **(re)print shelf labels** from the Barcodes screen in the existing label format — so
the app, not the PDFs, becomes the source of truth, and the current physical labels stay valid.

## 2. The real shelf data (verified from the PDFs)

Codes are a clean, deterministic, fixture-typed scheme (`Z<zone>-<S|G|P|R><seq>`, seq padded to 3),
contiguous with no gaps/dupes:

| Zone (code) | Fixtures → count | Zone total |
|------|------------------|-----------|
| Z1 (Z01) | S 1–116 | 116 |
| Z2 (Z02) | S 1–37, G 1–11 | 48 |
| Z3 (Z03) | S 1–96, P 1–22 | 118 |
| Z4 (Z04) | P 1–62 | 62 |
| Z5 (Z05) | R 1–136 | 136 |
| Z6 (Z06) | S 1–132 | 132 |
| | **Total** | **612** |

> Note: a shelf **code** uses a single-digit zone (`Z2-G005`) while `zones.code` is zero-padded
> (`Z02`). The `shelves` row stores both: `code = 'Z2-G005'`, `zone_code = 'Z02'`.

## 3. Decisions (locked)

| Decision | Choice |
|----------|--------|
| Unknown shelf on capture/transfer/stock | **Warn but allow** (soft "not a registered shelf" note; still saves). |
| Label printing access | **Open to everyone** (same as the item-code part of Barcodes). |
| Label format | **Match existing** — one label per page, per zone, same U&M design + Code 128. |
| Validation touch-points | Capture, Transfer, Stock (not the Items Edit modal). |
| Re-labeling | **None needed** — codes are unchanged; this registers what exists + enables reprints. |

## 4. Database — migration `0014_shelves.sql` (user runs)

```sql
create table shelves (
  code         text primary key check (code ~ '^Z[0-9]+-[SGPR][0-9]+$'),
  zone_code    text not null references zones(code),
  fixture_type fixture_type not null,
  seq          int  not null,
  unique (zone_code, fixture_type, seq)
);

-- Seeded deterministically from the real label data (612 rows) via generate_series.
insert into shelves (code, zone_code, fixture_type, seq)
  select 'Z1-S'||lpad(g::text,3,'0'), 'Z01', 'S'::fixture_type, g from generate_series(1,116) g
  union all select 'Z2-S'||lpad(g::text,3,'0'), 'Z02', 'S'::fixture_type, g from generate_series(1,37) g
  union all select 'Z2-G'||lpad(g::text,3,'0'), 'Z02', 'G'::fixture_type, g from generate_series(1,11) g
  union all select 'Z3-S'||lpad(g::text,3,'0'), 'Z03', 'S'::fixture_type, g from generate_series(1,96) g
  union all select 'Z3-P'||lpad(g::text,3,'0'), 'Z03', 'P'::fixture_type, g from generate_series(1,22) g
  union all select 'Z4-P'||lpad(g::text,3,'0'), 'Z04', 'P'::fixture_type, g from generate_series(1,62) g
  union all select 'Z5-R'||lpad(g::text,3,'0'), 'Z05', 'R'::fixture_type, g from generate_series(1,136) g
  union all select 'Z6-S'||lpad(g::text,3,'0'), 'Z06', 'S'::fixture_type, g from generate_series(1,132) g
on conflict do nothing;

alter table shelves enable row level security;
create policy "Shelves readable" on shelves for select using (auth.role() = 'authenticated');
create policy "Shelves admin-write" on shelves for all
  using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
```
Hand-add `shelves` types to `database.ts`.

## 5. Validation — warn but allow

- **`useShelves()`** — reads all `shelves` rows (612; `staleTime: Infinity`) → `ShelfRow[]`.
- **`src/lib/shelfRegistry.ts`** (pure, tested):
  ```ts
  export function buildShelfCodeSet(rows: ReadonlyArray<{ code: string }>): Set<string>;  // uppercased
  export function isKnownShelf(set: Set<string>, code: string): boolean;                   // trim+uppercase
  ```
- **`useShelfChecker()`** (in `useShelves.ts`) → `(code: string) => boolean | null`
  (`null` = registry not loaded yet / empty input → no warning).
- Touch-points show a soft warning only when the checker returns **`false`**:
  - **Capture** `ShelfCard` — under the active shelf.
  - **NewTransferModal** — under source and dest shelf inputs.
  - **MovementModal** — under the shelf input.
  Wording: "⚠ Not a registered shelf". Never blocks save.

## 6. Shelf labels — Barcodes screen (open to all)

- **`src/lib/shelfLabelPdf.ts`** — `buildShelfLabelsPdf(zoneCode, shelves)`: for each shelf in the zone
  (ordered by fixture S,G,P,R then seq), render its Code 128 via **JsBarcode** to a canvas and add one
  **100×50 mm landscape page** to a **jsPDF** doc — header "U&M DESIGNS · STORE TANAWADA · SHELF
  LOCATION", big `code`, "ZONE n", "Shelf k of {zone total}", "Store Tanawada", the barcode, and the
  code text. Mirrors the existing item-label approach already in `BarcodesScreen`. Saves
  `UM_{zone}_Labels.pdf`. *(The "Shelf k of total" counter is cosmetic; codes/barcodes match the
  originals exactly, so reprints are drop-in.)*
- **`src/screens/Barcodes/ShelfLabels.tsx`** — a section with a **zone picker** (zones that have
  shelves) showing each zone's shelf count, and a **"Download labels PDF"** button → `buildShelfLabelsPdf`.
- Wired into **`BarcodesScreen`** below the existing item-code UI.

## 7. Files

| File | Responsibility |
|------|----------------|
| `supabase/migrations/0014_shelves.sql` | Table + RLS + generate_series seed *(user runs)* |
| `src/types/database.ts` (modify) | `shelves` types |
| `src/types/shelf-row.ts` | `ShelfRow` alias |
| `src/hooks/useShelves.ts` | `useShelves()` + `useShelfChecker()` |
| `src/lib/shelfRegistry.ts` (+ test) | `buildShelfCodeSet`, `isKnownShelf` |
| `src/lib/shelfLabelPdf.ts` | `buildShelfLabelsPdf` |
| `src/screens/Barcodes/ShelfLabels.tsx` | Zone picker + download |
| `src/screens/Barcodes/BarcodesScreen.tsx` (modify) | Mount the section |
| `src/screens/Capture/ShelfCard.tsx`, `NewTransferModal.tsx`, `MovementModal.tsx` (modify) | Unregistered-shelf warning |

## 8. Testing

- **`shelfRegistry.test.ts`**: `buildShelfCodeSet` normalizes to uppercase; `isKnownShelf` hits a known
  code (case/space-insensitive) and misses an unknown one.
- Hooks, the PDF, and warnings: `tsc --noEmit`, `npm run build`, and manual (scan/typo an unregistered
  shelf → warning shows, save still works; Barcodes → pick a zone → PDF downloads matching the labels).

## 9. Out of scope

- Adding/editing/deleting shelves in-app (the 612 are the current physical reality; a future
  "shelves admin" can come later — admins can edit the table directly meanwhile).
- Hard-blocking unknown shelves (chosen: warn-and-allow).
- A multi-up label sheet (chosen: match existing one-per-page).
- Changing any existing shelf codes or re-labeling.
