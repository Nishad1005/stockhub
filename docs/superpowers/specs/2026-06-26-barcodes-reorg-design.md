# Barcodes Screen Reorganization — Design Spec

Status: **approved** · Date: 2026-06-26 · Pure UI reorganization, no data/mutation changes.

---

## 1. Problem

The Barcodes screen (`src/screens/Barcodes/BarcodesScreen.tsx`) is one long scroll:
header → bulk actions → a flat, ungrouped list of **every** captured item (newest-first)
→ Shelf-coverage card → Shelf-labels reprint at the very bottom.

Two pain points for the operator:
- **Shelf labels are buried** — you must scroll past every item barcode to reach the
  zone reprint.
- **Item barcodes aren't organized** — all zones are mixed in one list; finding a
  zone's items means scanning the whole list.

## 2. Goal

Reorganize the screen so shelf labels are immediately reachable and item barcodes are
filterable by zone — without changing any existing behavior (assign codes, select +
download PDF, barcode rendering, shelf reprint).

## 3. Design

### 3.1 Two tabs
A tab toggle at the top of the screen: **`[ Item barcodes | Shelf labels ]`**, using the
same `Chip`-based toggle pattern as `StockScreen` (`flex gap-1 bg-brand-accent-soft/50
rounded-xl p-1`, two `flex-1` chips). Default tab: **Item barcodes**. State is local
`useState<"items" | "shelf">("items")`.

### 3.2 Item barcodes tab
- **Bulk action bar (top, unchanged, global):** "Assign codes to N NEW" and
  "Download N labels (PDF)". Both operate globally:
  - Assign-all assigns codes to every NEW entry across all zones (count = total NEW).
  - Download builds a PDF of every **selected** entry, regardless of the current zone
    filter. The selection `Set<string>` **persists** across zone-filter changes so the
    operator can cherry-pick across zones.
- **Zone filter chips:** a row of `Chip`s — `All` plus one chip per zone that has
  entries, each with a count (e.g. `Z03 · 12`). Mirrors `ItemsScreen`'s zone chips.
  Local `useState<string>("all")`. Tapping a zone filters the list to that
  `zone_code`; `All` shows everything.
- **Item list:** the existing per-entry cards (selection checkbox when coded, code +
  `<Barcode>` or "Assign ITM code" button), filtered to the selected zone. Order
  unchanged (newest-first). Empty state when the filtered list is empty.

### 3.3 Shelf labels tab
The existing `<ShelfCoverage />` and `<ShelfLabels />`, rendered immediately (no item
list above them). `ShelfLabels` drops its `mt-4` top margin since it is now the top of
its tab (cosmetic only).

## 4. Behavior preserved (no change)

Assign one / assign all, select + download labels PDF, per-item barcode rendering, and
the zone-reprint flow are all unchanged. This is reorganization + a client-side zone
filter only — no hooks, mutations, validators, or data paths are touched.

## 5. Code structure

- **New `src/screens/Barcodes/ItemBarcodes.tsx`** — owns the item-barcode concern: the
  `useEntries`/`useAssignItemCode` data, `selected` set, `assignAll`/`assignOne`/
  `download` handlers, the zone filter chips, and the item list. (Moved out of
  `BarcodesScreen` so each file stays focused.)
- **`src/screens/Barcodes/BarcodesScreen.tsx`** — slimmed to: `ScreenHeader`, the
  tab toggle, and conditional render of `<ItemBarcodes />` or
  (`<ShelfCoverage /> <ShelfLabels />`). Keeps the header subtitle counts.
- **New pure helper `src/lib/barcodeZones.ts`** — `zonesPresent(entries): { zone: string;
  count: number }[]` returning zone codes that have entries, sorted ascending, with
  counts. Unit-tested.
- `ShelfLabels.tsx`, `ShelfCoverage.tsx`, `useAssignItemCode`, `lib/labels.ts` — unchanged
  (ShelfLabels only loses a top margin).

## 6. Testing

- Unit test `src/lib/barcodeZones.test.ts` for `zonesPresent` (grouping, sort, counts,
  empty → `[]`).
- `npx tsc --noEmit` clean, `npm run build` green, `npx vitest run` all pass.
- Manual parity: assign one/all, select across zones + download, switch tabs, zone-filter,
  shelf reprint — all behave as before.

## 7. Out of scope (YAGNI)

- No grouped/collapsible zone sections (zone chips chosen instead).
- No change to the label PDF format, the assign-code flow, or the shelf registry.
- No persistence of the selected tab/zone across navigation (resets on remount).
