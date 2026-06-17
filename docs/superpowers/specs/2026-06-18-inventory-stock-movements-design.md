# Inventory — Stock IN/OUT + Running Stock — Design Spec (Phase 11)

Status: **approved** · Date: 2026-06-18 · Largely net-new (Credit/Debit were "Ship 2" in v0.1).
Builds on the `movements` table, `movement_type` enum, `grn_seq`/`mir_seq`, and `running_stock`
view already in `supabase/migrations/0001_initial_schema.sql`.

---

## 1. Goal

Record stock **IN (Credit / GRN)** and **OUT (Debit / MIR)** as audited movements, keep live
quantities correct, surface **running stock** per item/shelf, capture **over-issue discrepancies**
for audit, and alert managers to **empty shelf locations** — all under a live-count model that also
fixes the existing `running_stock` double-count.

## 2. Decisions (locked)

| Decision | Choice |
|----------|--------|
| Stock model | **Live-count.** `entries.qty` is the source of truth. `movements` + `transfers` are the audit log. |
| Double-count fix | Replace `running_stock` view with `sum(entries.qty)` per (item, shelf). |
| Scope | Stock IN, Stock OUT, **Stock levels** view, movement **History**, discrepancy capture, manager **Alerts** panel. |
| Ref numbers | IN → `GRN/YYYY-MM/NNNN`, OUT → `MIR/YYYY-MM/NNNN` (auto, like STN). |
| Over-issue (OUT > on-hand) | **Confirm-and-log.** Logs the movement with `available_qty`, sets the entry to 0. |
| Discrepancy record | New `movements.available_qty` column → a movement is a discrepancy when `qty > available_qty`. |
| Empty alert | **Per location:** an `entries` row whose `qty` reaches **0** = "this item at this shelf is empty." |
| Alerts surface | **Computed** manager/admin-only panel on the existing **Find/Dashboard** screen (out-of-stock locations + recent discrepancies). No notifications system / acknowledge workflow. |
| Navigation | **7th "📊 Stock" tab** (hub). Transfers stays its own tab. |

## 3. Stock model (live-count) behavior

One movement = one item. Shelves are scan-only (same rule as Capture/Transfers; manager
manual-entry override applies). Item matching at a shelf reuses `findSourceEntry` (shelf + item)
from `src/lib/transferMatch.ts`.

### 3.1 Stock IN (Credit · GRN)
Fields: item (master search), **destination shelf** (scan → zone auto-derives), qty (>0),
`source_or_dest` (supplier / source store / "Production"), reason?, authorized_by?, notes?.
On save:
1. `next_grn_number()` RPC.
2. Insert a `movements` row: `type='IN'`, ref, item, shelf/zone/fixture, qty, source_or_dest,
   reason, authorized_by, notes, `available_qty = null`, created_by.
3. Update live stock: if a matching entry exists at that shelf → **add** qty; else **create** an
   entry there (qty = received, master_code/name/defn/category copied from the picked item).
4. Invalidate `entries` + `movements`.

### 3.2 Stock OUT (Debit · MIR)
Fields: item, **shelf** (scan), qty (>0), `source_or_dest` (department / "Dispatch" / "Scrap" /
"Loss"), reason?, authorized_by?, notes?. On save:
1. Compute `available` = matched entry's `qty` (0 if no matching entry).
2. If `qty > available`: **confirm** ("System shows {available} at {shelf}, issuing {qty}. Proceed?").
   If declined, abort.
3. `next_mir_number()` RPC.
4. Insert a `movements` row: `type='OUT'`, …, `available_qty = available` (so requested vs
   available is permanently auditable).
5. Update live stock: if a matching entry exists → set `qty = max(0, qty − out)`. If none exists,
   no entry is mutated (audit-only OUT — the movement still records the attempt and `available_qty=0`).
6. Invalidate `entries` + `movements`.

> The OUT never makes `qty` negative; an over-issue floors the entry at 0 and is flagged as a
> discrepancy via `available_qty`.

## 4. Discrepancy capture & display

- A movement is a **discrepancy** ⇔ `type='OUT'` AND `available_qty != null` AND `qty > available_qty`.
  Shortfall = `qty − available_qty`.
- In **History**, discrepancy rows show a ⚠ badge + "issued {qty}, only {available} on hand
  (short {shortfall})", and a **"Discrepancies" filter** toggles the list to just these.
- Same rows feed the Dashboard Alerts panel (§6).

## 5. Running stock & Stock levels

- **DB:** replace the `running_stock` view with the live-count rollup
  (`sum(entries.qty)` per `master_code, shelf_code`). Fixes the double-count for any SQL consumer.
- **UI (Stock levels):** computed **client-side from `entries`** (so NEW/unassigned items are
  included, not just master-matched). `rollUpStock(entries)` groups by item identity
  (`master_code ?? assigned_code ?? name`) → `{ code, name, total, byShelf: [{ shelf, qty }] }`,
  sorted by name. Per-item total with an expandable per-shelf breakdown; rows where a shelf qty = 0
  show an **"empty"** chip; total = 0 shows an **"out of stock"** chip.

## 6. Manager Alerts panel (Find/Dashboard screen)

Rendered **only when `useAuth().isManager`**, at the top of the existing `DashboardScreen`.
Two computed sections (live from `useEntries` + `useMovements`):
- **Empty locations** — `emptyLocations(entries)` = entries with `qty === 0`, shown as
  "{item} @ {shelf} — empty". Count badge.
- **Recent discrepancies** — `discrepancies(movements)` (most recent first), shown as
  "{ref} · {item} @ {shelf} — issued {qty}, only {available} on hand".
Storekeepers don't see the panel.

## 7. Database — migration `0010_inventory.sql` (user runs it)

```sql
-- Live-count: stock is simply the sum of entry quantities (transfers + IN/OUT all mutate entries).
create or replace view running_stock as
  select master_code, shelf_code, sum(coalesce(qty, 0))::numeric as stock
  from entries
  where master_code is not null
  group by master_code, shelf_code;

-- Audit the system on-hand at the moment of an OUT (null for IN); discrepancy when qty > available_qty.
alter table movements add column if not exists available_qty numeric;

-- Ref-number generators (sequences grn_seq / mir_seq already exist).
create or replace function next_grn_number() returns text language plpgsql as $$
declare ym text := to_char(now(),'YYYY-MM'); n int := nextval('grn_seq');
begin return 'GRN/' || ym || '/' || lpad(n::text, 4, '0'); end $$;

create or replace function next_mir_number() returns text language plpgsql as $$
declare ym text := to_char(now(),'YYYY-MM'); n int := nextval('mir_seq');
begin return 'MIR/' || ym || '/' || lpad(n::text, 4, '0'); end $$;

grant execute on function next_grn_number() to authenticated;
grant execute on function next_mir_number() to authenticated;
```

- `movements` table + RLS (readable by authenticated, insert where `created_by = auth.uid()`) already
  exist — unchanged. Movements are immutable (no update/delete policy, by design).
- Hand-add to `src/types/database.ts` (so code compiles before the user regenerates): the
  `movements.available_qty` field, and `next_grn_number` / `next_mir_number` under Functions.

## 8. Navigation

- Add a **7th tab** to `TabBar.tsx`: `{ to: "/stock", label: "Stock", icon: "📊" }` (bar grid already
  scales to `TABS.length`; 7 tabs ≈ 53px each — accepted).
- `App.tsx`: add `<Route path="/stock" … >`.
- `StockScreen` = header + two actions (**📥 Stock IN**, **📤 Stock OUT**) opening a shared
  `MovementModal type="IN"|"OUT"`, then a segmented control: **Stock levels** | **History**.

## 9. Files

| File | Responsibility |
|------|----------------|
| `supabase/migrations/0010_inventory.sql` | View fix + `available_qty` + GRN/MIR RPCs *(user runs)* |
| `src/types/database.ts` (modify) | Hand-add `available_qty` + the two RPCs |
| `src/types/movement.ts` | `MovementRow` / `MovementInsert` aliases |
| `src/lib/stockLevels.ts` (+ test) | `rollUpStock`, `emptyLocations`, `discrepancies` (pure) |
| `src/lib/validators/movement.ts` (+ test) | Zod `createMovementSchema` |
| `src/hooks/useMovements.ts` | Read movements (newest first) |
| `src/hooks/useCreateMovement.ts` | RPC ref → insert movement → mutate entry |
| `src/screens/Stock/StockScreen.tsx` | Hub: actions + segmented Levels/History |
| `src/screens/Stock/MovementModal.tsx` | Shared IN/OUT form + over-issue confirm |
| `src/screens/Stock/MovementDetailModal.tsx` | Read-only movement detail |
| `src/screens/Stock/StockLevels.tsx` | Per-item rollup view |
| `src/screens/Stock/MovementHistory.tsx` | Movement list + discrepancy badge/filter |
| `src/screens/Dashboard/DashboardScreen.tsx` (modify) | Manager-only Alerts panel |
| `src/components/TabBar.tsx` (modify) | Add 📊 Stock tab |
| `src/App.tsx` (modify) | Add `/stock` route |

## 10. Testing

- **`stockLevels.test.ts`** (pure): `rollUpStock` groups + sums + per-shelf breakdown + identity
  fallback (master→assigned→name); `emptyLocations` returns only `qty === 0` rows; `discrepancies`
  returns only OUT rows with `qty > available_qty` and the right shortfall.
- **`movement.test.ts`**: item required; invalid shelf rejected; qty ≤ 0 rejected; `source_or_dest`
  required; type IN/OUT accepted.
- Hooks/screens/Alerts panel: `tsc --noEmit`, `npm run build`, manual verification.

## 11. Out of scope (deferred)

- Durable, acknowledge-able alerts; email/push notifications; low-stock thresholds (only **zero** is
  flagged now).
- Multi-line GRN/MIR documents (each movement is single-item).
- Editing/voiding a movement (immutable audit log).
- Reworking Capture/Items/Find to read computed stock (we stay live-count).
