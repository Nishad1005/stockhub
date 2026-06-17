# Item Detail + One-Tap Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A reusable bottom-sheet `ItemDetailModal` — opened by tapping an item in Items/Find/Stock levels — showing its locations, total, and merged activity, with per-location Move/Out/Edit and item-level Stock IN that open the existing modals pre-filled.

**Architecture:** One pure lib (`itemDetail.ts`) selects an item's entries + activity from already-cached data. The existing Transfer/Movement modals gain optional `initial*` props. The detail modal renders those modals over itself. No DB changes, no new deps.

**Tech Stack:** React 18 + TS, TanStack Query v5, Vitest.

Spec: `docs/superpowers/specs/2026-06-18-item-detail-design.md`.

---

## File structure

| File | Responsibility |
|------|----------------|
| `src/lib/itemDetail.ts` (+ test) | `sameItem`, `itemLocations`, `itemActivity` |
| `src/screens/ItemDetail/ItemDetailModal.tsx` | The sheet + nested action modals |
| `src/screens/Transfers/NewTransferModal.tsx` (modify) | `initialItem` / `initialSourceShelf` props |
| `src/screens/Stock/MovementModal.tsx` (modify) | `initialItem` / `initialShelf` props |
| `src/screens/Items/ItemsScreen.tsx` (modify) | Tap → detail |
| `src/screens/Dashboard/DashboardScreen.tsx` (modify) | Tap located row → detail |
| `src/screens/Stock/StockLevels.tsx` (modify) | Tap item → detail |

---

## Task 1: `itemDetail.ts` selectors

**Files:** Create `src/lib/itemDetail.ts`, Test `src/lib/itemDetail.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/itemDetail.test.ts
import { describe, it, expect } from "vitest";
import { sameItem, itemLocations, itemActivity } from "./itemDetail";
import type { EntryRow } from "@/types/entry";
import type { MovementRow } from "@/types/movement";
import type { TransferRow } from "@/types/transfer";

const e = (p: Partial<EntryRow>): EntryRow =>
  ({
    id: "e", created_at: "2026-06-18T00:00:00Z", updated_at: "2026-06-18T00:00:00Z", created_by: "u1",
    zone_code: "Z03", shelf_code: "Z3-S001", fixture_type: "S", name: "Foam",
    master_code: null, assigned_code: null, defn: null, category: null,
    qty: 0, notes: null, photo_url: null, scanned_barcode: null, ...p,
  }) as unknown as EntryRow;

const mv = (p: Partial<MovementRow>): MovementRow =>
  ({
    id: "m", created_at: "2026-06-18T00:00:00Z", created_by: "u1", type: "IN",
    ref_number: "GRN/2026-06/0001", item_code: "ITM-1", item_name: "Foam",
    shelf_code: "Z3-S001", zone_code: "Z03", fixture_type: "S", qty: 5,
    source_or_dest: "Acme", reason: null, authorized_by: null, notes: null, available_qty: null, ...p,
  }) as unknown as MovementRow;

const tr = (p: Partial<TransferRow>): TransferRow =>
  ({
    id: "t", created_at: "2026-06-18T00:00:00Z", created_by: "u1", stn_number: "STN/2026-06/0001",
    item_code: "ITM-1", item_name: "Foam", item_defn: null, item_category: null,
    source_zone: "Z03", source_shelf: "Z3-S001", dest_zone: "Z04", dest_shelf: "Z4-S002",
    qty: 2, reason: null, storekeeper: null, helper: null, source_deducted: true, notes: null, ...p,
  }) as unknown as TransferRow;

describe("sameItem", () => {
  it("matches by code, falls back to name (case-insensitive), and misses otherwise", () => {
    expect(sameItem("ITM-1", "Foam", { code: "ITM-1", name: "whatever" })).toBe(true);
    expect(sameItem(null, "Foam", { code: null, name: "foam" })).toBe(true);
    expect(sameItem(null, "Wood", { code: null, name: "Foam" })).toBe(false);
  });
});

describe("itemLocations", () => {
  it("returns the item's entries sorted by shelf", () => {
    const out = itemLocations(
      [
        e({ id: "1", master_code: "ITM-1", shelf_code: "Z4-S002", qty: 3 }),
        e({ id: "2", master_code: "ITM-1", shelf_code: "Z3-S001", qty: 5 }),
        e({ id: "3", master_code: "ITM-9", name: "Wood", shelf_code: "Z5-S003", qty: 1 }),
      ],
      { code: "ITM-1", name: "Foam" },
    );
    expect(out.map((x) => x.id)).toEqual(["2", "1"]);
  });
});

describe("itemActivity", () => {
  it("merges movements + transfers for the item, newest first, capped", () => {
    const out = itemActivity(
      [
        mv({ id: "a", type: "IN", qty: 5, shelf_code: "Z3-S001", ref_number: "GRN/2026-06/0001", created_at: "2026-06-18T08:00:00Z" }),
        mv({ id: "b", item_code: "ITM-9", item_name: "Wood", created_at: "2026-06-18T07:00:00Z" }),
      ],
      [tr({ id: "c", qty: 2, created_at: "2026-06-18T09:00:00Z" })],
      { code: "ITM-1", name: "Foam" },
      8,
    );
    expect(out.map((x) => [x.kind, x.id])).toEqual([["TRANSFER", "c"], ["IN", "a"]]);
    expect(out[0].summary).toBe("2: Z3-S001 → Z4-S002");
    expect(out[1].summary).toBe("5 @ Z3-S001");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/itemDetail.test.ts`
Expected: FAIL — "Failed to resolve import './itemDetail'".

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/itemDetail.ts
import type { EntryRow } from "@/types/entry";
import type { MovementRow } from "@/types/movement";
import type { TransferRow } from "@/types/transfer";

export interface ItemSelector {
  code: string | null;
  name: string;
}

/**
 * True when a record (its code + name) is the selected item. Matches by code
 * when the selector has one, and always accepts a case-insensitive name match
 * (so NEW / assigned-code items, whose movements carry no master code, still
 * match). Two items sharing an identical name would co-match — acceptable here.
 */
export function sameItem(code: string | null, name: string, sel: ItemSelector): boolean {
  if (sel.code != null && code === sel.code) return true;
  return (name || "").trim().toLowerCase() === (sel.name || "").trim().toLowerCase();
}

/** The item's entries (one per location), sorted by shelf code. */
export function itemLocations(entries: ReadonlyArray<EntryRow>, sel: ItemSelector): EntryRow[] {
  return entries
    .filter((e) => sameItem(e.master_code ?? e.assigned_code, e.name, sel))
    .sort((a, b) => a.shelf_code.localeCompare(b.shelf_code));
}

export interface ActivityItem {
  id: string;
  kind: "IN" | "OUT" | "TRANSFER";
  ref: string;
  when: string;
  summary: string;
}

/** Merged movement + transfer activity for the item, newest first, capped at `limit`. */
export function itemActivity(
  movements: ReadonlyArray<MovementRow>,
  transfers: ReadonlyArray<TransferRow>,
  sel: ItemSelector,
  limit = 8,
): ActivityItem[] {
  const fromMovements: ActivityItem[] = movements
    .filter((m) => sameItem(m.item_code, m.item_name, sel))
    .map((m) => ({
      id: m.id,
      kind: m.type === "IN" ? "IN" : "OUT",
      ref: m.ref_number,
      when: m.created_at,
      summary: `${m.qty} @ ${m.shelf_code}`,
    }));
  const fromTransfers: ActivityItem[] = transfers
    .filter((t) => sameItem(t.item_code, t.item_name, sel))
    .map((t) => ({
      id: t.id,
      kind: "TRANSFER" as const,
      ref: t.stn_number,
      when: t.created_at,
      summary: `${t.qty}: ${t.source_shelf} → ${t.dest_shelf}`,
    }));
  return [...fromMovements, ...fromTransfers]
    .sort((a, b) => b.when.localeCompare(a.when))
    .slice(0, limit);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/itemDetail.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/itemDetail.ts src/lib/itemDetail.test.ts
git commit -m "feat(item-detail): item selection + activity helpers"
```

---

## Task 2: `NewTransferModal` initial props

**Files:** Modify `src/screens/Transfers/NewTransferModal.tsx`

- [ ] **Step 1: Add the props to the interface**

Replace:

```tsx
export interface NewTransferModalProps {
  onClose: () => void;
}

export function NewTransferModal({ onClose }: NewTransferModalProps) {
```

with:

```tsx
export interface NewTransferModalProps {
  onClose: () => void;
  initialItem?: { name: string; code: string | null; defn: string | null; category: string | null };
  initialSourceShelf?: string;
}

export function NewTransferModal({ onClose, initialItem, initialSourceShelf }: NewTransferModalProps) {
```

- [ ] **Step 2: Seed the item + source-shelf state from the props**

Replace:

```tsx
  const [itemName, setItemName] = useState("");
  const [itemCode, setItemCode] = useState<string | null>(null);
  const [itemDefn, setItemDefn] = useState<string | null>(null);
  const [itemCategory, setItemCategory] = useState<string | null>(null);
  const [sourceShelf, setSourceShelf] = useState("");
```

with:

```tsx
  const [itemName, setItemName] = useState(initialItem?.name ?? "");
  const [itemCode, setItemCode] = useState<string | null>(initialItem?.code ?? null);
  const [itemDefn, setItemDefn] = useState<string | null>(initialItem?.defn ?? null);
  const [itemCategory, setItemCategory] = useState<string | null>(initialItem?.category ?? null);
  const [sourceShelf, setSourceShelf] = useState(initialSourceShelf ?? "");
```

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run build`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/screens/Transfers/NewTransferModal.tsx
git commit -m "feat(item-detail): NewTransferModal accepts initial item + source shelf"
```

---

## Task 3: `MovementModal` initial props

**Files:** Modify `src/screens/Stock/MovementModal.tsx`

- [ ] **Step 1: Add the props to the interface**

Replace:

```tsx
export interface MovementModalProps {
  type: "IN" | "OUT";
  onClose: () => void;
}

export function MovementModal({ type, onClose }: MovementModalProps) {
```

with:

```tsx
export interface MovementModalProps {
  type: "IN" | "OUT";
  onClose: () => void;
  initialItem?: { name: string; code: string | null; defn: string | null; category: string | null };
  initialShelf?: string;
}

export function MovementModal({ type, onClose, initialItem, initialShelf }: MovementModalProps) {
```

- [ ] **Step 2: Seed the item + shelf state from the props**

Replace:

```tsx
  const [itemName, setItemName] = useState("");
  const [itemCode, setItemCode] = useState<string | null>(null);
  const [itemDefn, setItemDefn] = useState<string | null>(null);
  const [itemCategory, setItemCategory] = useState<string | null>(null);
  const [shelfCode, setShelfCode] = useState("");
```

with:

```tsx
  const [itemName, setItemName] = useState(initialItem?.name ?? "");
  const [itemCode, setItemCode] = useState<string | null>(initialItem?.code ?? null);
  const [itemDefn, setItemDefn] = useState<string | null>(initialItem?.defn ?? null);
  const [itemCategory, setItemCategory] = useState<string | null>(initialItem?.category ?? null);
  const [shelfCode, setShelfCode] = useState(initialShelf ?? "");
```

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run build`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/screens/Stock/MovementModal.tsx
git commit -m "feat(item-detail): MovementModal accepts initial item + shelf"
```

---

## Task 4: `ItemDetailModal`

**Files:** Create `src/screens/ItemDetail/ItemDetailModal.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/screens/ItemDetail/ItemDetailModal.tsx
import { useMemo, useState } from "react";
import { useEntries } from "@/hooks/useEntries";
import { useMovements } from "@/hooks/useMovements";
import { useTransfers } from "@/hooks/useTransfers";
import { itemLocations, itemActivity, type ItemSelector } from "@/lib/itemDetail";
import { ZONE_INDEX } from "@/constants/zones";
import { NewTransferModal } from "@/screens/Transfers/NewTransferModal";
import { MovementModal } from "@/screens/Stock/MovementModal";
import { EditEntryModal } from "@/screens/Items/EditEntryModal";
import type { EntryRow } from "@/types/entry";

export interface ItemDetailModalProps {
  selector: ItemSelector;
  onClose: () => void;
}

type Action =
  | { kind: "transfer"; entry: EntryRow }
  | { kind: "out"; entry: EntryRow }
  | { kind: "edit"; entry: EntryRow }
  | { kind: "in" }
  | null;

export function ItemDetailModal({ selector, onClose }: ItemDetailModalProps) {
  const { data: entries = [] } = useEntries();
  const { data: movements = [] } = useMovements();
  const { data: transfers = [] } = useTransfers();
  const [action, setAction] = useState<Action>(null);

  const locations = useMemo(() => itemLocations(entries, selector), [entries, selector]);
  const activity = useMemo(() => itemActivity(movements, transfers, selector), [movements, transfers, selector]);
  const total = useMemo(() => locations.reduce((s, e) => s + (e.qty ?? 0), 0), [locations]);

  const first = locations[0];
  const code = selector.code ?? null;
  const name = first?.name ?? selector.name;
  const defn = first?.defn ?? null;
  const category = first?.category ?? null;
  const itemFields = { name, code, defn, category };

  const actBtn = "text-[11px] font-semibold rounded-lg border border-brand-line px-2 py-1";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 flex items-end sm:items-center justify-center" onClick={onClose}>
        <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-2xl p-5 max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between mb-1">
            <div className="min-w-0">
              <div className="text-sm font-bold text-brand-ink truncate">
                <span className={`mr-1.5 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${code ? "bg-brand-ok/15 text-brand-ok" : "bg-brand-warn/15 text-brand-warn"}`}>
                  {code ?? "NEW"}
                </span>
                {name}
              </div>
              {(defn || category) && <div className="text-xs text-brand-mute">{[defn, category].filter(Boolean).join(" · ")}</div>}
            </div>
            <button onClick={onClose} className="text-brand-mute text-lg leading-none px-1">✕</button>
          </div>

          <div className="flex items-center justify-between mt-2 mb-3">
            <div className="text-xs text-brand-mute">Total on hand: <span className="font-mono font-bold text-brand-ink">{total}</span></div>
            <button onClick={() => setAction({ kind: "in" })} className="rounded-lg bg-brand-ok text-white font-semibold px-3 py-1.5 text-xs">📥 Stock IN</button>
          </div>

          <div className="text-[10px] font-bold uppercase tracking-wide text-brand-mute mb-1">Locations</div>
          {locations.length === 0 ? (
            <p className="text-sm text-brand-mute mb-3">Not recorded at any shelf.</p>
          ) : (
            <ul className="divide-y divide-brand-line mb-4">
              {locations.map((e) => (
                <li key={e.id} className="py-2 flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-mono font-bold text-brand-ink">{e.shelf_code}</div>
                    <div className="text-[11px] text-brand-mute">{ZONE_INDEX[e.zone_code]?.name ?? e.zone_code} · qty {e.qty ?? "—"}</div>
                  </div>
                  <button onClick={() => setAction({ kind: "transfer", entry: e })} className={actBtn}>Move</button>
                  <button onClick={() => setAction({ kind: "out", entry: e })} className={actBtn}>Out</button>
                  <button onClick={() => setAction({ kind: "edit", entry: e })} className={actBtn}>Edit</button>
                </li>
              ))}
            </ul>
          )}

          <div className="text-[10px] font-bold uppercase tracking-wide text-brand-mute mb-1">Recent activity</div>
          {activity.length === 0 ? (
            <p className="text-sm text-brand-mute">No activity yet.</p>
          ) : (
            <ul className="space-y-1">
              {activity.map((a) => (
                <li key={a.kind + a.id} className="text-xs flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${a.kind === "IN" ? "bg-brand-ok/15 text-brand-ok" : a.kind === "OUT" ? "bg-brand-bad/15 text-brand-bad" : "bg-brand-accent-soft text-brand-accent-2"}`}>
                    {a.kind === "TRANSFER" ? "MOVE" : a.kind}
                  </span>
                  <span className="font-mono text-brand-mute shrink-0">{a.ref.split("/").pop()}</span>
                  <span className="text-brand-ink truncate">{a.summary}</span>
                  <span className="text-brand-mute ml-auto shrink-0">{new Date(a.when).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {action?.kind === "transfer" && (
        <NewTransferModal initialItem={itemFields} initialSourceShelf={action.entry.shelf_code} onClose={() => setAction(null)} />
      )}
      {action?.kind === "out" && (
        <MovementModal type="OUT" initialItem={itemFields} initialShelf={action.entry.shelf_code} onClose={() => setAction(null)} />
      )}
      {action?.kind === "in" && (
        <MovementModal type="IN" initialItem={itemFields} onClose={() => setAction(null)} />
      )}
      {action?.kind === "edit" && (
        <EditEntryModal entry={action.entry} onClose={() => setAction(null)} />
      )}
    </>
  );
}
```

- [ ] **Step 2: Typecheck + build**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run build`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/screens/ItemDetail/ItemDetailModal.tsx
git commit -m "feat(item-detail): ItemDetailModal sheet with per-location actions"
```

---

## Task 5: wire `ItemsScreen` (tap → detail)

**Files:** Modify `src/screens/Items/ItemsScreen.tsx`

- [ ] **Step 1: Swap the import**

Replace line 9:

```tsx
import { EditEntryModal } from "./EditEntryModal";
```

with:

```tsx
import { ItemDetailModal } from "@/screens/ItemDetail/ItemDetailModal";
import type { ItemSelector } from "@/lib/itemDetail";
```

- [ ] **Step 2: Swap the state (line 17)**

Replace:

```tsx
  const [editing, setEditing] = useState<EntryRow | null>(null);
```

with:

```tsx
  const [detail, setDetail] = useState<ItemSelector | null>(null);
```

- [ ] **Step 3: Change the row tap (line 107)**

Replace:

```tsx
                  onClick={() => setEditing(e)}
```

with:

```tsx
                  onClick={() => setDetail({ code: e.master_code ?? e.assigned_code, name: e.name })}
```

- [ ] **Step 4: Swap the mounted modal (line 145)**

Replace:

```tsx
      {editing && <EditEntryModal entry={editing} onClose={() => setEditing(null)} />}
```

with:

```tsx
      {detail && <ItemDetailModal selector={detail} onClose={() => setDetail(null)} />}
```

- [ ] **Step 5: Typecheck + build**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run build`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/screens/Items/ItemsScreen.tsx
git commit -m "feat(item-detail): Items tap opens Item Detail"
```

---

## Task 6: wire `DashboardScreen` (Find) located rows

**Files:** Modify `src/screens/Dashboard/DashboardScreen.tsx`

- [ ] **Step 1: Add imports**

After the existing `import { discrepancies … }` / stockLevels import line, add:

```tsx
import { ItemDetailModal } from "@/screens/ItemDetail/ItemDetailModal";
import type { ItemSelector } from "@/lib/itemDetail";
```

- [ ] **Step 2: Add detail state**

After the line `const [scanOpen, setScanOpen] = useState(false);`, add:

```tsx
  const [detail, setDetail] = useState<ItemSelector | null>(null);
```

- [ ] **Step 3: Make each located item a tappable button**

Replace this block (inside `byLocation.map`):

```tsx
                      {items.map((e) => (
                        <div key={e.id} className="text-sm text-brand-ink truncate">
                          {codeBadge(e)}
                          {e.name}
                          {e.qty != null && <span className="text-brand-mute"> · qty {e.qty}</span>}
                        </div>
                      ))}
```

with:

```tsx
                      {items.map((e) => (
                        <button
                          key={e.id}
                          onClick={() => setDetail({ code: e.master_code ?? e.assigned_code, name: e.name })}
                          className="block w-full text-left text-sm text-brand-ink truncate"
                        >
                          {codeBadge(e)}
                          {e.name}
                          {e.qty != null && <span className="text-brand-mute"> · qty {e.qty}</span>}
                        </button>
                      ))}
```

- [ ] **Step 4: Mount the modal**

Immediately after the `<CameraScanner … />` element (near the end, before the closing `</div>`), add:

```tsx
      {detail && <ItemDetailModal selector={detail} onClose={() => setDetail(null)} />}
```

- [ ] **Step 5: Typecheck + build**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run build`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/screens/Dashboard/DashboardScreen.tsx
git commit -m "feat(item-detail): Find located rows open Item Detail"
```

---

## Task 7: wire `StockLevels` rows

**Files:** Modify `src/screens/Stock/StockLevels.tsx`

- [ ] **Step 1: Replace the whole file**

```tsx
// src/screens/Stock/StockLevels.tsx
import { useMemo, useState } from "react";
import { useEntries } from "@/hooks/useEntries";
import { rollUpStock } from "@/lib/stockLevels";
import { ItemDetailModal } from "@/screens/ItemDetail/ItemDetailModal";
import type { ItemSelector } from "@/lib/itemDetail";

export function StockLevels() {
  const { data: entries = [], isLoading } = useEntries();
  const [detail, setDetail] = useState<ItemSelector | null>(null);
  const items = useMemo(() => rollUpStock(entries), [entries]);

  return (
    <>
      {isLoading ? (
        <p className="text-sm text-brand-mute p-3 text-center">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-brand-mute p-6 text-center">No stock recorded yet.</p>
      ) : (
        <ul className="divide-y divide-brand-line">
          {items.map((it) => (
            <li key={(it.code ?? it.name) + it.name} className="py-2">
              <button
                onClick={() => setDetail({ code: it.code, name: it.name })}
                className="w-full text-left flex items-center justify-between"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-brand-ink truncate">
                    {it.code && <span className="mr-1 text-[10px] font-mono font-bold px-1 py-0.5 rounded bg-brand-ok/15 text-brand-ok">{it.code}</span>}
                    {it.name}
                  </div>
                  <div className="text-[11px] text-brand-mute">
                    {it.byShelf.map((s) => (
                      <span key={s.shelf} className="mr-2">
                        <span className="font-mono">{s.shelf}</span>:{s.qty}
                        {s.qty === 0 && <span className="ml-0.5 text-brand-warn">empty</span>}
                      </span>
                    ))}
                  </div>
                </div>
                <div className={`font-mono font-bold shrink-0 ${it.total === 0 ? "text-brand-bad" : "text-brand-ink"}`}>
                  {it.total}
                  {it.total === 0 && <span className="block text-[9px] font-sans text-brand-bad">out of stock</span>}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      {detail && <ItemDetailModal selector={detail} onClose={() => setDetail(null)} />}
    </>
  );
}
```

- [ ] **Step 2: Typecheck + build**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run build`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/screens/Stock/StockLevels.tsx
git commit -m "feat(item-detail): Stock levels rows open Item Detail"
```

---

## Task 8: full verification

- [ ] **Step 1: Typecheck, build, and run the whole test suite**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run build`
Expected: "built in …", no errors.
Run: `npx vitest run`
Expected: all tests pass (53 existing + 3 new = 56).

---

## Done — manual verification

1. **Items / Find / Stock levels** → tapping any item opens the **Item Detail** sheet (header with code/name/total, locations, recent activity).
2. **Per-location**: each shelf row's **Move** opens Transfer with item + that source shelf pre-filled; **Out** opens Stock OUT with item + shelf pre-filled (on-hand banner correct); **Edit** opens the entry's Edit modal.
3. **Item-level 📥 Stock IN** opens Stock IN with the item pre-filled (shelf scanned in the modal).
4. After saving any action, the sheet's **locations + total + activity update live** (no manual refresh).
5. **Recent activity** shows merged IN/OUT (`GRN`/`MIR`) and transfers (`MOVE`/`STN`), newest first, ≤ 8.
6. Closing an action modal returns to the detail; closing the detail returns to the screen you were on.
