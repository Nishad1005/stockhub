# Transfers + STN — Design Spec

_StockHub v0.2 · Phase 6 · 2026-06-15_

Port the v0.1 Transfers workflow (record a stock movement between two shelves
with a Stock Transfer Note) into the React/TypeScript + Supabase app. v0.1 is
the spec: `legacy/UM_Designs_StockHub.html` (`openTransferModal`,
`saveTransfer`, `checkSourceEntry`, `renderTransfersScreen`,
`openTransferDetail`).

---

## 1. Goal

Let a storekeeper move stock from one shelf to another and produce an auditable
**STN** (Stock Transfer Note, `STN/YYYY-MM/NNNN`). Saving a transfer **moves the
stock** (matches v0.1): the item immediately shows at its new shelf in Items and
Find, and the STN is the paper trail.

---

## 2. Data model — already in place (no DB work)

Migration `0001_initial_schema.sql` already created everything; **no new
migration, no DB action required from the project owner this time**:

- **`transfers` table** — mirrors `src/types/transfer.ts`:
  `id, created_at, created_by, stn_number, item_code, item_name, item_defn,
  item_category, source_zone, source_shelf, dest_zone, dest_shelf, qty, reason,
  storekeeper, helper, source_deducted, notes`.
- **`next_stn_number()`** — Postgres function over `stn_seq`, returns
  `STN/YYYY-MM/NNNN`. **Server-side and monotonic across devices** (replaces
  v0.1's client counter, per CLAUDE.md §11.5).
- **RLS** — transfers readable by any authenticated user; insert requires
  `created_by = auth.uid()`.
- **`running_stock` view** — already references transfers (see §7).

Verify during implementation that the generated `src/types/database.ts` contains
the `transfers` table and the `next_stn_number` RPC (migration 0001 is applied).
If either is missing from the types, the only owner action is a types regen
(`npx supabase gen types typescript --linked > src/types/database.ts`); no SQL.

---

## 3. Behavior

Saving a transfer performs three steps:

1. **Record the STN.** Call `next_stn_number()`, insert a `transfers` row.
2. **Decrement the source.** Find the matching entry at the source shelf and
   reduce its `qty`. If none is found, the transfer is still logged
   (audit-only) with `source_deducted = false`.
3. **Create the destination entry.** Insert a new entry at the dest shelf
   (`qty` = transferred qty, `notes` = `Transferred from <sourceShelf> · <STN>`)
   so the item appears at its new location in Items and Find.

### Zone from shelf (deviation from v0.1 form)
v0.1 had separate zone dropdowns plus shelf inputs. To stay consistent with our
Capture screen and CLAUDE.md §5.2, **zone auto-derives from the scanned shelf**:
`source_zone` / `dest_zone` come from `validateShelf(shelf).zoneCode`. No
separate zone pickers.

### Scan-only enforcement (§5.4)
Source and destination shelf inputs are **scan-only by default**. Manager
"manual entry mode" (`stores/session.ts`) unlocks typing for the session, exactly
like `ShelfCard`. Each field has its own Scan button opening `CameraScanner`.

### Source detection
When item + source shelf are set, look up a matching entry to drive a live
banner:
- match = `entries` where `shelf_code === sourceShelf` AND
  (`master_code === itemCode` when matched, else `name` equals the typed name,
  case-insensitive).
- Found → "✓ Found at source — qty available: N. Will deduct on save."
- Not found → "⚠ No matching entry at source — will log as audit only."
- If transfer qty > available qty, Save asks for confirmation (does not block).

### Validation (reject on save)
- Item name required.
- Source shelf and dest shelf both valid (`SHELF_RE`).
- Source shelf ≠ dest shelf.
- Qty an integer > 0.
- `reason`, `storekeeper`, `helper` optional.

---

## 4. Components (follow existing patterns)

| File | Responsibility |
|------|----------------|
| `src/hooks/useTransfers.ts` | Read all transfers, newest-first (React Query, `transfersKeys.all`). |
| `src/hooks/useCreateTransfer.ts` | The mutation: STN → insert transfer → decrement source → create dest entry → invalidate `entries` + `transfers`. |
| `src/lib/validators/transfer.ts` | Zod schema + `CreateTransferInput` type. |
| `src/lib/transferStats.ts` | Pure `transferStats(transfers) → { today, week, total }`. Unit-tested. |
| `src/screens/Transfers/TransfersScreen.tsx` | Stats header, "New Transfer" button, list, empty state, opens detail. |
| `src/screens/Transfers/NewTransferModal.tsx` | Item (`MasterSearch` + scan), source shelf (scan), dest shelf (scan), qty, reason, storekeeper, helper, source banner. |
| `src/screens/Transfers/TransferDetailModal.tsx` | Read-only STN view: FROM → TO, qty, reason, signatures. |

Reuses: `components/Modal`, `components/CameraScanner`, `components/MasterSearch`,
`lib/shelf-validator` (`validateShelf`), `hooks/useEntries`, `stores/toast`,
`stores/session` (manual-entry mode), `constants/zones` (`ZONE_INDEX`).

`useCreateTransfer` derives `source_zone` / `dest_zone` from the validated
shelves (same approach as `useCreateEntry`), gets `created_by` from
`supabase.auth.getUser()`, and writes the dest entry through the same insert
shape `useCreateEntry` uses.

---

## 5. Navigation

- Add a 5th tab to `components/TabBar.tsx`:
  **Capture 📷 · Items 📦 · Transfers 🔄 · Find 🔍 · Barcodes 🏷️**.
- Add a protected `/transfers` route in `App.tsx`.

---

## 6. Tests

- `transferStats` — buckets by today / last-7-days / total (Vitest).
- `transfer` validator — rejects empty item, invalid/identical shelves, qty ≤ 0.
- Build stays green: `tsc --noEmit`, existing 29 tests still pass.

---

## 7. Deferred: running_stock reconciliation

`running_stock` adds `transfers.qty` to the dest shelf and subtracts it from the
source shelf (when `source_deducted`). Because we **also** move the stock by
mutating `entries` (decrement source, create dest entry), a transfer would be
counted twice **if** the view were read. It is not read anywhere yet — it exists
for the Phase 11 inventory module. When Phase 11 surfaces `running_stock`, the
view must be reconciled (either stop mutating entries and rely on the view, or
exclude entry-materialized transfers from the view). No impact on anything shown
today; documented here so it is not forgotten.

---

## 8. Out of scope

- Editing or deleting a transfer (append-only audit log, like v0.1).
- CSV export of transfers (belongs with Settings/exports, Phase 8).
- Surfacing `running_stock` anywhere (Phase 11).
- Credit/Debit movements (Phase 11).
