# Item Detail + One-Tap Actions — Design Spec

Status: **approved** · Date: 2026-06-18 · Process-improvement (no DB changes, no new deps).

---

## 1. Goal

Unify an item's scattered information (where it is, how much, its history) into one
**bottom-sheet** opened by tapping the item anywhere (Items, Find, Stock levels), and let the user
launch **Transfer / Stock IN / Stock OUT / Edit** from there with the item (and shelf) **pre-filled** —
removing the re-find/re-type friction across screens.

## 2. Decisions (locked)

| Decision | Choice |
|----------|--------|
| Surface | **Bottom-sheet modal** (`ItemDetailModal`), consistent with existing modals. |
| Identity | An item = `code` (`master_code ?? assigned_code`) or `name` when there's no code. |
| Actions | **Per-location** Move / Stock OUT / Edit on each shelf row (item + shelf pre-filled), plus one item-level **Stock IN**. |
| Activity | **Merged** movements (GRN/MIR) + transfers (STN), newest-first, **last 8**, no "see all". |
| Opens from | **Items**, **Find/Dashboard**, **Stock levels** rows. In Items, tap now opens detail (Edit moves inside). |
| Data | All from cached `useEntries` / `useMovements` / `useTransfers`. No new queries, no DB change. |

## 3. Layout (top → bottom)

1. **Header** — code badge (or `NEW`), name, **total qty** across all shelves, definition · category.
2. **📥 Stock IN** button (item-level; shelf chosen inside the modal).
3. **Locations** — one row per shelf the item sits on: `shelf · zoneName · qty`, each with **Move**,
   **Stock OUT**, **Edit** buttons.
4. **Recent activity** — merged feed (≤8): `IN`/`OUT` (`ref · qty @ shelf`) and `TRANSFER`
   (`STN · qty: src→dest`), newest first. Empty state: "No activity yet."

## 4. Data selection — `src/lib/itemDetail.ts` (pure, tested)

```ts
export interface ItemSelector { code: string | null; name: string }

/** True when a record (its code+name) is the selected item. Matches by code when
 *  present, else by name; name is also accepted so NEW/assigned-code items still match. */
export function sameItem(code: string | null, name: string, sel: ItemSelector): boolean;

/** Entries for this item (each = one location), sorted by shelf_code. */
export function itemLocations(entries: ReadonlyArray<EntryRow>, sel: ItemSelector): EntryRow[];

export interface ActivityItem {
  id: string;
  kind: "IN" | "OUT" | "TRANSFER";
  ref: string;
  when: string;        // ISO
  summary: string;     // "5 @ Z3-S042" | "5: Z3-S042 → Z4-S002"
}

/** Merged movement+transfer activity for the item, newest first, capped at `limit` (default 8). */
export function itemActivity(
  movements: ReadonlyArray<MovementRow>,
  transfers: ReadonlyArray<TransferRow>,
  sel: ItemSelector,
  limit?: number,
): ActivityItem[];
```

- `sameItem`: `(sel.code != null && code === sel.code) || name.trim().toLowerCase() === sel.name.trim().toLowerCase()`.
  *(Caveat: two distinct items sharing an identical name would co-match; acceptable for this app.)*
- `itemLocations` matches entries via `sameItem(e.master_code ?? e.assigned_code, e.name, sel)`.
- `itemActivity` matches via `sameItem(m.item_code, m.item_name, sel)` / `sameItem(t.item_code, t.item_name, sel)`,
  maps each to an `ActivityItem`, concatenates, sorts by `when` desc, slices to `limit`.

## 5. Pre-fill — additive props on existing modals

- `NewTransferModal` → `initialItem?: { name; code; defn; category }`, `initialSourceShelf?: string`
  (seed the item fields + source shelf from state initializers).
- `MovementModal` → `initialItem?: { name; code; defn; category }`, `initialShelf?: string`.
- `EditEntryModal` → **unchanged**; per-location Edit passes the existing `EntryRow`.

All new props are optional; existing call sites (Stock screen, Transfers screen) are unaffected.

## 6. `ItemDetailModal` behavior

- Props: `{ selector: ItemSelector; onClose: () => void }`.
- Reads `useEntries`/`useMovements`/`useTransfers`; computes `itemLocations` + `itemActivity` + total.
- Holds local `action` state; renders the chosen action modal **over** the sheet:
  - Move → `NewTransferModal` with `initialItem` + `initialSourceShelf = row.shelf_code`.
  - Stock OUT → `MovementModal type="OUT"` with `initialItem` + `initialShelf = row.shelf_code`.
  - Edit → `EditEntryModal entry={row}`.
  - Stock IN (item-level) → `MovementModal type="IN"` with `initialItem` (no shelf).
- Closing an action modal returns to the detail; React Query invalidation (already in the mutations)
  refreshes the locations/activity live.

## 7. Wiring the three surfaces

Each passes `{ code: master_code ?? assigned_code, name }` to `ItemDetailModal`:
- **ItemsScreen** — row tap `setEditing(e)` → `setDetail({ code, name })`; remove the direct
  `EditEntryModal` mount (Edit now lives in the detail).
- **DashboardScreen (Find)** — make each located row a button opening the detail.
- **StockLevels** — make each item row a button opening the detail (it already has `code`/`name`).

## 8. Files

| File | Responsibility |
|------|----------------|
| `src/lib/itemDetail.ts` (+ test) | `sameItem`, `itemLocations`, `itemActivity` |
| `src/screens/ItemDetail/ItemDetailModal.tsx` | The sheet + nested action modals |
| `src/screens/Transfers/NewTransferModal.tsx` (modify) | `initialItem` / `initialSourceShelf` props |
| `src/screens/Stock/MovementModal.tsx` (modify) | `initialItem` / `initialShelf` props |
| `src/screens/Items/ItemsScreen.tsx` (modify) | Tap → detail |
| `src/screens/Dashboard/DashboardScreen.tsx` (modify) | Tap located row → detail |
| `src/screens/Stock/StockLevels.tsx` (modify) | Tap item → detail |

## 9. Testing

- **`itemDetail.test.ts`**: `sameItem` (code match, name fallback, miss); `itemLocations` (filters by
  item, sorts by shelf); `itemActivity` (merges movements+transfers, sorts newest-first, caps at limit,
  summaries formatted).
- Modal/wiring: `tsc --noEmit`, `npm run build`, manual.

## 10. Out of scope

- Item Detail as a deep-linkable route (it's a modal).
- "See all activity" pagination (capped at 8).
- Editing/voiding movements; changing how identity works elsewhere.
- Photo gallery across locations (header shows none; per-location Edit still shows that entry's photo).
