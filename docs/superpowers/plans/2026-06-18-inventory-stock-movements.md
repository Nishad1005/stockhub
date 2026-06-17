# Inventory — Stock IN/OUT + Running Stock — Implementation Plan (Phase 11)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record Stock IN (GRN) / OUT (MIR) as audited `movements` that update live `entries.qty`, surface per-item running stock, capture over-issue discrepancies, and alert managers to empty shelf locations.

**Architecture:** Live-count — `entries.qty` is the truth; movements are an immutable audit log. Pure helpers compute rollups/alerts from data already loaded (`entries`, `movements`); a shared modal does IN/OUT; the `running_stock` view is simplified to fix the double-count.

**Tech Stack:** React 18 + TS, TanStack Query v5, Zustand, Zod, Supabase JS, Vitest. **No new dependencies.**

Spec: `docs/superpowers/specs/2026-06-18-inventory-stock-movements-design.md`.

---

## File structure

| File | Responsibility |
|------|----------------|
| `src/lib/stockLevels.ts` (+ test) | Pure: `rollUpStock`, `emptyLocations`, `discrepancies` |
| `src/lib/validators/movement.ts` (+ test) | Zod `createMovementSchema` |
| `supabase/migrations/0010_inventory.sql` | View fix + `available_qty` + GRN/MIR RPCs *(user runs)* |
| `src/types/database.ts` (modify) | Hand-add `available_qty` + the two RPCs |
| `src/types/movement.ts` | `MovementRow` / `MovementInsert` aliases |
| `src/hooks/useMovements.ts` | Read movements (newest first) |
| `src/hooks/useCreateMovement.ts` | RPC ref → insert movement → mutate entry |
| `src/screens/Stock/MovementModal.tsx` | Shared IN/OUT form |
| `src/screens/Stock/MovementDetailModal.tsx` | Read-only detail |
| `src/screens/Stock/StockLevels.tsx` | Per-item rollup view |
| `src/screens/Stock/MovementHistory.tsx` | History list + discrepancy filter |
| `src/screens/Stock/StockScreen.tsx` | Hub: actions + segmented Levels/History |
| `src/screens/Dashboard/DashboardScreen.tsx` (modify) | Manager-only Alerts panel |
| `src/components/TabBar.tsx` (modify) | Add 📊 Stock tab |
| `src/App.tsx` (modify) | Add `/stock` route |

---

## Task 1: stock rollup helpers (`stockLevels.ts`)

**Files:** Create `src/lib/stockLevels.ts`, Test `src/lib/stockLevels.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/stockLevels.test.ts
import { describe, it, expect } from "vitest";
import { rollUpStock, emptyLocations, discrepancies } from "./stockLevels";
import type { EntryRow } from "@/types/entry";

// Local shape for discrepancies() — keeps this task independent of the movement types task.
type Mv = {
  id: string; created_at: string; type: "IN" | "OUT"; ref_number: string;
  item_name: string; shelf_code: string; qty: number; available_qty: number | null;
};

const e = (p: Partial<EntryRow>): EntryRow =>
  ({
    id: "e", created_at: "2026-06-18T00:00:00Z", updated_at: "2026-06-18T00:00:00Z", created_by: "u1",
    zone_code: "Z03", shelf_code: "Z3-S001", fixture_type: "S", name: "Foam",
    master_code: null, assigned_code: null, defn: null, category: null,
    qty: 0, notes: null, photo_url: null, scanned_barcode: null, ...p,
  }) as unknown as EntryRow;

const m = (p: Partial<Mv>): Mv => ({
  id: "m", created_at: "2026-06-18T00:00:00Z", type: "OUT",
  ref_number: "MIR/2026-06/0001", item_name: "Foam", shelf_code: "Z3-S001",
  qty: 8, available_qty: 5, ...p,
});

describe("rollUpStock", () => {
  it("groups by item across shelves and sums, with per-shelf breakdown", () => {
    const out = rollUpStock([
      e({ id: "1", master_code: "ITM-1", name: "Foam", shelf_code: "Z3-S001", qty: 5 }),
      e({ id: "2", master_code: "ITM-1", name: "Foam", shelf_code: "Z4-S002", qty: 3 }),
      e({ id: "3", master_code: null, assigned_code: null, name: "Loose Cloth", shelf_code: "Z3-S001", qty: 2 }),
    ]);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({
      code: "ITM-1",
      name: "Foam",
      total: 8,
      byShelf: [{ shelf: "Z3-S001", qty: 5 }, { shelf: "Z4-S002", qty: 3 }],
    });
    expect(out[1].name).toBe("Loose Cloth"); // grouped by name when no code
    expect(out[1].code).toBeNull();
  });
});

describe("emptyLocations", () => {
  it("returns only entries whose qty is exactly 0", () => {
    const out = emptyLocations([
      e({ id: "1", master_code: "ITM-1", name: "Foam", shelf_code: "Z3-S001", qty: 0 }),
      e({ id: "2", name: "Wood", shelf_code: "Z4-S002", qty: 4 }),
      e({ id: "3", name: "Glue", shelf_code: "Z5-S003", qty: null }),
    ]);
    expect(out).toEqual([{ code: "ITM-1", name: "Foam", shelf: "Z3-S001" }]);
  });
});

describe("discrepancies", () => {
  it("returns OUT movements where requested exceeds available, newest first", () => {
    const out = discrepancies([
      m({ id: "a", qty: 8, available_qty: 5, created_at: "2026-06-18T08:00:00Z" }),
      m({ id: "b", type: "IN", qty: 9, available_qty: null }),
      m({ id: "c", qty: 3, available_qty: 5, created_at: "2026-06-18T09:00:00Z" }), // within stock
      m({ id: "d", qty: 10, available_qty: 4, created_at: "2026-06-18T10:00:00Z" }),
    ]);
    expect(out.map((x) => x.id)).toEqual(["d", "a"]);
    expect(out[1]).toMatchObject({ ref: "MIR/2026-06/0001", requested: 8, available: 5, shortfall: 3 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/stockLevels.test.ts`
Expected: FAIL — "Failed to resolve import './stockLevels'".

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/stockLevels.ts
import type { EntryRow } from "@/types/entry";

export interface ShelfQty {
  shelf: string;
  qty: number;
}
export interface ItemStock {
  code: string | null;
  name: string;
  total: number;
  byShelf: ShelfQty[];
}

/** Per-item live stock from entries (identity: master → assigned → name). */
export function rollUpStock(entries: ReadonlyArray<EntryRow>): ItemStock[] {
  const map = new Map<string, { code: string | null; name: string; total: number; shelves: Map<string, number> }>();
  for (const e of entries) {
    const code = e.master_code ?? e.assigned_code ?? null;
    const key = code ?? `name:${(e.name || "").trim().toLowerCase()}`;
    const qty = e.qty ?? 0;
    let it = map.get(key);
    if (!it) {
      it = { code, name: e.name, total: 0, shelves: new Map() };
      map.set(key, it);
    }
    it.total += qty;
    it.shelves.set(e.shelf_code, (it.shelves.get(e.shelf_code) ?? 0) + qty);
  }
  return [...map.values()]
    .map((it) => ({
      code: it.code,
      name: it.name,
      total: it.total,
      byShelf: [...it.shelves.entries()]
        .map(([shelf, qty]) => ({ shelf, qty }))
        .sort((a, b) => a.shelf.localeCompare(b.shelf)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export interface EmptyLocation {
  code: string | null;
  name: string;
  shelf: string;
}

/** Depleted item-locations: entries whose qty is exactly 0. */
export function emptyLocations(entries: ReadonlyArray<EntryRow>): EmptyLocation[] {
  return entries
    .filter((e) => e.qty === 0)
    .map((e) => ({ code: e.master_code ?? e.assigned_code ?? null, name: e.name, shelf: e.shelf_code }));
}

export interface Discrepancy {
  id: string;
  ref: string;
  name: string;
  shelf: string;
  requested: number;
  available: number;
  shortfall: number;
  created_at: string;
}

/** Minimal movement shape discrepancies() needs (MovementRow satisfies it structurally). */
export interface DiscrepancySource {
  id: string;
  ref_number: string;
  item_name: string;
  shelf_code: string;
  qty: number;
  available_qty: number | null;
  type: string;
  created_at: string;
}

/** OUT movements where the issued qty exceeded the recorded on-hand, newest first. */
export function discrepancies(movements: ReadonlyArray<DiscrepancySource>): Discrepancy[] {
  return movements
    .filter((mv) => mv.type === "OUT" && mv.available_qty != null && mv.qty > mv.available_qty)
    .map((mv) => {
      const available = mv.available_qty as number;
      return {
        id: mv.id,
        ref: mv.ref_number,
        name: mv.item_name,
        shelf: mv.shelf_code,
        requested: mv.qty,
        available,
        shortfall: mv.qty - available,
        created_at: mv.created_at,
      };
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/stockLevels.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/stockLevels.ts src/lib/stockLevels.test.ts
git commit -m "feat(inventory): stock rollup + empty/discrepancy helpers"
```

---

## Task 2: movement validator

**Files:** Create `src/lib/validators/movement.ts`, Test `src/lib/validators/movement.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/validators/movement.test.ts
import { describe, it, expect } from "vitest";
import { createMovementSchema } from "./movement";

const base = { type: "IN", itemName: "Foam", shelfCode: "Z3-S042", qty: "10", sourceOrDest: "Acme Supplies" };

describe("createMovementSchema", () => {
  it("accepts a valid movement and coerces qty", () => {
    const v = createMovementSchema.parse(base);
    expect(v.qty).toBe(10);
    expect(v.itemCode).toBeNull();
  });
  it("rejects a missing item name", () => {
    expect(() => createMovementSchema.parse({ ...base, itemName: "  " })).toThrow();
  });
  it("rejects qty of zero", () => {
    expect(() => createMovementSchema.parse({ ...base, qty: "0" })).toThrow();
  });
  it("rejects an invalid shelf", () => {
    expect(() => createMovementSchema.parse({ ...base, shelfCode: "NOPE" })).toThrow();
  });
  it("rejects a missing source/destination", () => {
    expect(() => createMovementSchema.parse({ ...base, sourceOrDest: "" })).toThrow();
  });
  it("rejects an unknown type", () => {
    expect(() => createMovementSchema.parse({ ...base, type: "SIDEWAYS" })).toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/validators/movement.test.ts`
Expected: FAIL — "Failed to resolve import './movement'".

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/validators/movement.ts
/**
 * Stock movement validation (Stock IN / OUT). One movement = one item.
 *  - type IN or OUT
 *  - item name required; valid shelf; qty integer >= 1
 *  - source_or_dest required (supplier for IN / department for OUT)
 */
import { z } from "zod";
import { requiredName, optionalText } from "./entry";
import { validateShelf } from "@/lib/shelf-validator";

const movementQty = z.preprocess(
  (v) => {
    if (v === "" || v === null || v === undefined) return Number.NaN;
    const n = typeof v === "number" ? Math.trunc(v) : parseInt(String(v).trim(), 10);
    return Number.isFinite(n) ? n : Number.NaN;
  },
  z.number({ invalid_type_error: "Quantity must be a whole number" })
    .int("Quantity must be a whole number")
    .positive("Quantity must be 1 or more"),
);

const requiredSourceOrDest = z.preprocess(
  (v) => (v == null ? "" : String(v).trim()),
  z.string().min(1, "Source/destination is required"),
);

export const createMovementSchema = z
  .object({
    type: z.enum(["IN", "OUT"]),
    itemName: requiredName,
    itemCode: optionalText.optional().default(null),
    itemDefn: optionalText.optional().default(null),
    itemCategory: optionalText.optional().default(null),
    shelfCode: z.string().min(1, "Shelf is required"),
    qty: movementQty,
    sourceOrDest: requiredSourceOrDest,
    reason: optionalText.optional().default(null),
    authorizedBy: optionalText.optional().default(null),
    notes: optionalText.optional().default(null),
  })
  .superRefine((val, ctx) => {
    if (!validateShelf(val.shelfCode).ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["shelfCode"], message: "Invalid shelf code" });
    }
  });

export type CreateMovementInput = z.input<typeof createMovementSchema>;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/validators/movement.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/validators/movement.ts src/lib/validators/movement.test.ts
git commit -m "feat(inventory): createMovementSchema validator"
```

---

## Task 3: migration + types + aliases

**Files:** Create `supabase/migrations/0010_inventory.sql`, Modify `src/types/database.ts`, Create `src/types/movement.ts`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/0010_inventory.sql
-- Phase 11 — Inventory (Stock IN/OUT + running stock).

-- Live-count: stock is simply the sum of entry quantities (transfers + IN/OUT all mutate entries).
create or replace view running_stock as
  select master_code, shelf_code, sum(coalesce(qty, 0))::numeric as stock
  from entries
  where master_code is not null
  group by master_code, shelf_code;

-- System on-hand at the moment of an OUT (null for IN); discrepancy when qty > available_qty.
alter table movements add column if not exists available_qty numeric;

-- Ref-number generators (sequences grn_seq / mir_seq already exist from migration 0001).
create or replace function next_grn_number() returns text language plpgsql as $$
declare ym text := to_char(now(),'YYYY-MM'); n int := nextval('grn_seq');
begin return 'GRN/' || ym || '/' || lpad(n::text, 4, '0'); end $$;

create or replace function next_mir_number() returns text language plpgsql as $$
declare ym text := to_char(now(),'YYYY-MM'); n int := nextval('mir_seq');
begin return 'MIR/' || ym || '/' || lpad(n::text, 4, '0'); end $$;

grant execute on function next_grn_number() to authenticated;
grant execute on function next_mir_number() to authenticated;
```

- [ ] **Step 2: Hand-add the types so code compiles before the user regenerates**

In `src/types/database.ts`:

(a) In the `movements` table, add an `available_qty` field to each shape:
- **Row** — add `available_qty: number | null`
- **Insert** — add `available_qty?: number | null`
- **Update** — add `available_qty?: number | null`

(b) In `Database["public"]["Functions"]`, alongside `next_stn_number`, add:

```typescript
      next_grn_number: { Args: never; Returns: string }
      next_mir_number: { Args: never; Returns: string }
```

- [ ] **Step 3: Create the type aliases**

```typescript
// src/types/movement.ts
import type { Database } from "./database";

export type MovementRow = Database["public"]["Tables"]["movements"]["Row"];
export type MovementInsert = Database["public"]["Tables"]["movements"]["Insert"];
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0010_inventory.sql src/types/database.ts src/types/movement.ts
git commit -m "feat(inventory): migration 0010 + movement types"
```

- [ ] **Step 6: USER STEP (out-of-band)** — owner runs `npx supabase db push`, then optionally `npx supabase gen types typescript --linked > src/types/database.ts` (PowerShell). Code already compiles against the hand-added types.

---

## Task 4: `useMovements` read hook

**Files:** Create `src/hooks/useMovements.ts`

- [ ] **Step 1: Create the hook**

```typescript
// src/hooks/useMovements.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { MovementRow } from "@/types/movement";

export const movementsKeys = { all: ["movements"] as const };

const PAGE = 1000;

async function fetchAllMovements(): Promise<MovementRow[]> {
  const all: MovementRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("movements")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...(data as MovementRow[]));
    if (data.length < PAGE) break;
  }
  return all;
}

/** All stock movements, newest first. */
export function useMovements() {
  return useQuery({ queryKey: movementsKeys.all, queryFn: fetchAllMovements });
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useMovements.ts
git commit -m "feat(inventory): useMovements hook"
```

---

## Task 5: `useCreateMovement` write hook

**Files:** Create `src/hooks/useCreateMovement.ts`

- [ ] **Step 1: Create the hook**

```typescript
// src/hooks/useCreateMovement.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { validateShelf } from "@/lib/shelf-validator";
import { createMovementSchema, type CreateMovementInput } from "@/lib/validators/movement";
import type { MovementRow, MovementInsert } from "@/types/movement";
import type { EntryInsert } from "@/types/entry";
import { entriesKeys } from "./useEntries";
import { movementsKeys } from "./useMovements";

export interface CreateMovementArgs {
  input: CreateMovementInput;
  /** Matched entry at the shelf (from findSourceEntry in the modal), or null. */
  matchedEntryId: string | null;
  /** On-hand qty at that shelf for an OUT (stored as available_qty); null for IN. */
  availableQty: number | null;
}

/**
 * Record a stock movement (live-count). Logs an immutable `movements` row, then
 * updates the live entry: IN adds (or creates the entry), OUT subtracts (floored
 * at 0). STN-style ref from next_grn_number()/next_mir_number().
 */
export function useCreateMovement() {
  const qc = useQueryClient();
  return useMutation<MovementRow, Error, CreateMovementArgs>({
    mutationFn: async ({ input, matchedEntryId, availableQty }) => {
      const v = createMovementSchema.parse(input);
      const shelf = validateShelf(v.shelfCode);
      if (!shelf.ok || !shelf.code || !shelf.zoneCode || !shelf.fixtureType) {
        throw new Error("Invalid shelf code");
      }

      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("You must be signed in to record a movement.");

      // 1. Ref number
      const rpc = v.type === "IN" ? "next_grn_number" : "next_mir_number";
      const { data: ref, error: refErr } = await supabase.rpc(rpc);
      if (refErr) throw refErr;
      if (!ref) throw new Error(`No ref number returned by ${rpc}()`);

      // 2. Insert the movement (audit)
      const row: MovementInsert = {
        created_by: uid,
        type: v.type,
        ref_number: ref,
        item_code: v.itemCode,
        item_name: v.itemName,
        shelf_code: shelf.code,
        zone_code: shelf.zoneCode,
        fixture_type: shelf.fixtureType,
        qty: v.qty,
        source_or_dest: v.sourceOrDest,
        reason: v.reason,
        authorized_by: v.authorizedBy,
        notes: v.notes,
        available_qty: v.type === "OUT" ? availableQty : null,
      };
      const { data: mv, error: mvErr } = await supabase.from("movements").insert(row).select().single();
      if (mvErr) throw mvErr;

      // 3. Update live stock
      if (matchedEntryId) {
        const { data: ent } = await supabase.from("entries").select("qty").eq("id", matchedEntryId).single();
        const current = ent?.qty ?? 0;
        const next = v.type === "IN" ? current + v.qty : Math.max(0, current - v.qty);
        const { error: updErr } = await supabase.from("entries").update({ qty: next }).eq("id", matchedEntryId);
        if (updErr) throw updErr;
      } else if (v.type === "IN") {
        // Stock arriving where the item wasn't recorded yet → create the entry.
        const newEntry: EntryInsert = {
          created_by: uid,
          zone_code: shelf.zoneCode,
          shelf_code: shelf.code,
          fixture_type: shelf.fixtureType,
          name: v.itemName,
          master_code: v.itemCode,
          assigned_code: null,
          defn: v.itemDefn,
          category: v.itemCategory,
          qty: v.qty,
          notes: `Stock IN · ${ref}`,
          photo_url: null,
          scanned_barcode: null,
        };
        const { error: insErr } = await supabase.from("entries").insert(newEntry);
        if (insErr) throw insErr;
      }
      // OUT with no matching entry → audit-only (movement recorded, available_qty=0, no entry mutated).

      return mv as MovementRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: movementsKeys.all });
      qc.invalidateQueries({ queryKey: entriesKeys.all });
    },
  });
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useCreateMovement.ts
git commit -m "feat(inventory): useCreateMovement mutation"
```

---

## Task 6: `MovementModal` (shared IN/OUT form)

**Files:** Create `src/screens/Stock/MovementModal.tsx`

- [ ] **Step 1: Create the modal**

```tsx
// src/screens/Stock/MovementModal.tsx
import { useMemo, useState } from "react";
import { MasterSearch } from "@/components/MasterSearch";
import { CameraScanner } from "@/components/CameraScanner";
import { useEntries } from "@/hooks/useEntries";
import { useCreateMovement } from "@/hooks/useCreateMovement";
import { useSessionStore } from "@/stores/session";
import { findSourceEntry } from "@/lib/transferMatch";
import { validateShelf } from "@/lib/shelf-validator";
import { ZONE_INDEX } from "@/constants/zones";
import { toast } from "@/stores/toast";
import { errMessage } from "@/lib/errors";
import type { MasterItem } from "@/types/master";

export interface MovementModalProps {
  type: "IN" | "OUT";
  onClose: () => void;
}

export function MovementModal({ type, onClose }: MovementModalProps) {
  const { data: entries = [] } = useEntries();
  const create = useCreateMovement();
  const manualEntryMode = useSessionStore((s) => s.manualEntryMode);

  const [itemName, setItemName] = useState("");
  const [itemCode, setItemCode] = useState<string | null>(null);
  const [itemDefn, setItemDefn] = useState<string | null>(null);
  const [itemCategory, setItemCategory] = useState<string | null>(null);
  const [shelfCode, setShelfCode] = useState("");
  const [qty, setQty] = useState("");
  const [sourceOrDest, setSourceOrDest] = useState("");
  const [reason, setReason] = useState("");
  const [authorizedBy, setAuthorizedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [scanOpen, setScanOpen] = useState(false);

  const isIn = type === "IN";
  const zone = validateShelf(shelfCode).zoneCode;
  const match = useMemo(
    () => findSourceEntry(entries, { shelfCode, itemCode, itemName }),
    [entries, shelfCode, itemCode, itemName],
  );
  const available = match?.qty ?? 0;

  function pick(it: MasterItem) {
    setItemName(it.name);
    setItemCode(it.code);
    setItemDefn(it.definition);
    setItemCategory(it.category);
  }
  function onNameChange(v: string) {
    setItemName(v);
    if (itemCode) setItemCode(null);
  }
  function onScan(decoded: string) {
    setScanOpen(false);
    const sv = validateShelf(decoded);
    if (!sv.ok || !sv.code) {
      toast(`Not a location code: ${decoded}`, "warn");
      return;
    }
    setShelfCode(sv.code);
  }

  async function save() {
    const qNum = parseInt(qty.trim(), 10);
    if (!isIn && Number.isFinite(qNum) && qNum > available) {
      if (!window.confirm(`System shows ${available} at ${shelfCode || "this shelf"}, issuing ${qNum}. Proceed?`)) return;
    }
    try {
      await create.mutateAsync({
        input: { type, itemName, itemCode, itemDefn, itemCategory, shelfCode, qty, sourceOrDest, reason, authorizedBy, notes },
        matchedEntryId: match?.id ?? null,
        availableQty: isIn ? null : available,
      });
      toast(isIn ? "Stock received" : "Stock issued", "ok");
      onClose();
    } catch (e) {
      toast("Failed: " + errMessage(e), "warn");
    }
  }

  const field =
    "w-full rounded-lg border border-brand-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent read-only:bg-brand-cream";

  return (
    <div className="fixed inset-0 z-40 bg-black/60 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-2xl p-5 max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-brand-ink">{isIn ? "📥 Stock IN (GRN)" : "📤 Stock OUT (MIR)"}</h2>
          <button onClick={onClose} className="text-brand-mute text-lg leading-none px-1">✕</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-brand-mute mb-1">Item <span className="text-brand-bad">*</span></label>
            <MasterSearch value={itemName} onChange={onNameChange} onPick={pick} />
            {itemCode && <span className="inline-block mt-1.5 text-xs font-semibold rounded px-2 py-0.5 bg-brand-ok text-white">✓ {itemCode}</span>}
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1 ${isIn ? "text-brand-ok" : "text-brand-bad"}`}>
              {isIn ? "To shelf" : "From shelf"} <span className="text-brand-bad">*</span>
            </label>
            <div className="flex gap-1">
              <input
                value={shelfCode}
                readOnly={!manualEntryMode}
                onChange={(e) => setShelfCode(e.target.value.toUpperCase())}
                placeholder={manualEntryMode ? "Z3-S042" : "Scan →"}
                className={`${field} font-mono font-bold uppercase tracking-wide`}
              />
              <button onClick={() => setScanOpen(true)} className="rounded-lg bg-brand-accent-2 text-white px-3 text-sm">📷</button>
            </div>
            {zone && <div className="text-[11px] text-brand-mute mt-0.5">{zone} · {ZONE_INDEX[zone]?.name}</div>}
          </div>

          {shelfCode && (itemCode || itemName.trim()) && (
            <div className={`text-xs rounded-lg p-2 ${match ? "bg-brand-ok/10 text-brand-ok" : "bg-brand-warn/10 text-brand-warn"}`}>
              {match
                ? `On hand here: ${available}. ${isIn ? "Will add to it." : "Will deduct on save."}`
                : isIn
                  ? "Not here yet — a new entry will be created at this shelf."
                  : "⚠ No stock of this item recorded here — will log as audit only."}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-brand-mute mb-1">Quantity <span className="text-brand-bad">*</span></label>
            <input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="—" className={field} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-brand-mute mb-1">
              {isIn ? "Supplier / source" : "Department / destination"} <span className="text-brand-bad">*</span>
            </label>
            <input value={sourceOrDest} onChange={(e) => setSourceOrDest(e.target.value)} placeholder={isIn ? "e.g. Acme Supplies / Production" : "e.g. Stitching / Dispatch / Scrap"} className={field} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-brand-mute mb-1">Reason</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} className={field} />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-brand-mute mb-1">Authorized by</label>
              <input value={authorizedBy} onChange={(e) => setAuthorizedBy(e.target.value)} className={field} />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-brand-mute mb-1">Notes</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} className={field} />
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 rounded-lg border border-brand-line py-2 text-sm font-semibold">Cancel</button>
          <button onClick={save} disabled={create.isPending} className="flex-1 rounded-lg bg-brand-accent-2 text-white py-2 text-sm font-semibold disabled:opacity-60">
            {create.isPending ? "Saving…" : isIn ? "Receive stock" : "Issue stock"}
          </button>
        </div>
      </div>

      <CameraScanner open={scanOpen} title={isIn ? "Scan destination shelf" : "Scan source shelf"} onClose={() => setScanOpen(false)} onDetected={onScan} />
    </div>
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
git add src/screens/Stock/MovementModal.tsx
git commit -m "feat(inventory): shared Stock IN/OUT modal"
```

---

## Task 7: `MovementDetailModal`

**Files:** Create `src/screens/Stock/MovementDetailModal.tsx`

- [ ] **Step 1: Create the modal**

```tsx
// src/screens/Stock/MovementDetailModal.tsx
import { ZONE_INDEX } from "@/constants/zones";
import type { MovementRow } from "@/types/movement";

export interface MovementDetailModalProps {
  movement: MovementRow;
  onClose: () => void;
}

export function MovementDetailModal({ movement: m, onClose }: MovementDetailModalProps) {
  const isIn = m.type === "IN";
  const discrepancy = m.type === "OUT" && m.available_qty != null && m.qty > m.available_qty;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-2xl p-5 max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-mono font-bold text-brand-accent-2">{m.ref_number}</h2>
          <button onClick={onClose} className="text-brand-mute text-lg leading-none px-1">✕</button>
        </div>

        <div className="text-xs text-brand-mute mb-3">{new Date(m.created_at).toLocaleString()}</div>

        <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded ${isIn ? "bg-brand-ok/15 text-brand-ok" : "bg-brand-bad/15 text-brand-bad"}`}>
          {isIn ? "STOCK IN" : "STOCK OUT"}
        </span>

        <div className="mt-3 mb-3">
          <div className="text-sm font-medium text-brand-ink">
            {m.item_code && <span className="mr-1.5 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-brand-ok/15 text-brand-ok">{m.item_code}</span>}
            {m.item_name}
          </div>
          <div className="text-xs text-brand-mute mt-1">
            {m.shelf_code} · {ZONE_INDEX[m.zone_code]?.name ?? m.zone_code}
          </div>
        </div>

        <div className="mb-3">
          <div className="text-[10px] font-bold uppercase tracking-wide text-brand-mute">Quantity</div>
          <div className="font-mono text-2xl font-bold text-brand-accent-2">{m.qty}</div>
          {discrepancy && (
            <div className="text-xs text-brand-bad mt-0.5">
              ⚠ Issued {m.qty}, only {m.available_qty} on hand (short {m.qty - (m.available_qty as number)})
            </div>
          )}
        </div>

        <div className="rounded-lg bg-brand-cream p-3 text-xs space-y-1">
          <div><b>{isIn ? "Supplier / source" : "Department / destination"}:</b> {m.source_or_dest}</div>
          {m.reason && <div><b>Reason:</b> {m.reason}</div>}
          {m.authorized_by && <div><b>Authorized by:</b> {m.authorized_by}</div>}
          {m.notes && <div><b>Notes:</b> {m.notes}</div>}
        </div>

        <button onClick={onClose} className="mt-4 w-full rounded-lg border border-brand-line py-2 text-sm font-semibold">Close</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/screens/Stock/MovementDetailModal.tsx
git commit -m "feat(inventory): MovementDetailModal"
```

---

## Task 8: `StockLevels` + `MovementHistory` sub-views

**Files:** Create `src/screens/Stock/StockLevels.tsx`, `src/screens/Stock/MovementHistory.tsx`

- [ ] **Step 1: Stock levels view**

```tsx
// src/screens/Stock/StockLevels.tsx
import { useMemo } from "react";
import { useEntries } from "@/hooks/useEntries";
import { rollUpStock } from "@/lib/stockLevels";

export function StockLevels() {
  const { data: entries = [], isLoading } = useEntries();
  const items = useMemo(() => rollUpStock(entries), [entries]);

  if (isLoading) return <p className="text-sm text-brand-mute p-3 text-center">Loading…</p>;
  if (items.length === 0) return <p className="text-sm text-brand-mute p-6 text-center">No stock recorded yet.</p>;

  return (
    <ul className="divide-y divide-brand-line">
      {items.map((it) => (
        <li key={(it.code ?? it.name) + it.name} className="py-2">
          <div className="flex items-center justify-between">
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
          </div>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Movement history view**

```tsx
// src/screens/Stock/MovementHistory.tsx
import { useMemo, useState } from "react";
import { useMovements } from "@/hooks/useMovements";
import { MovementDetailModal } from "./MovementDetailModal";
import type { MovementRow } from "@/types/movement";

function isDiscrepancy(m: MovementRow): boolean {
  return m.type === "OUT" && m.available_qty != null && m.qty > m.available_qty;
}

export function MovementHistory() {
  const { data: movements = [], isLoading } = useMovements();
  const [onlyDiscrepancies, setOnlyDiscrepancies] = useState(false);
  const [detail, setDetail] = useState<MovementRow | null>(null);

  const rows = useMemo(
    () => (onlyDiscrepancies ? movements.filter(isDiscrepancy) : movements),
    [movements, onlyDiscrepancies],
  );

  return (
    <div>
      <label className="flex items-center gap-2 text-xs text-brand-mute mb-2">
        <input type="checkbox" checked={onlyDiscrepancies} onChange={(e) => setOnlyDiscrepancies(e.target.checked)} />
        Discrepancies only
      </label>

      {isLoading && <p className="text-sm text-brand-mute p-3 text-center">Loading…</p>}
      {!isLoading && rows.length === 0 && <p className="text-sm text-brand-mute p-6 text-center">No movements.</p>}

      <ul className="divide-y divide-brand-line">
        {rows.map((m) => (
          <li key={m.id}>
            <button onClick={() => setDetail(m)} className="w-full text-left p-2 flex items-center gap-3">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${m.type === "IN" ? "bg-brand-ok/15 text-brand-ok" : "bg-brand-bad/15 text-brand-bad"}`}>
                {m.type}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-brand-ink truncate">
                  {m.item_name}
                  {isDiscrepancy(m) && <span className="ml-1 text-brand-bad">⚠</span>}
                </div>
                <div className="text-xs text-brand-mute truncate">
                  <span className="font-mono">{m.shelf_code}</span> · {m.ref_number} · {new Date(m.created_at).toLocaleDateString()}
                </div>
              </div>
              <span className="font-mono font-bold text-brand-ink shrink-0">{m.qty}</span>
            </button>
          </li>
        ))}
      </ul>

      {detail && <MovementDetailModal movement={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run build`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/screens/Stock/StockLevels.tsx src/screens/Stock/MovementHistory.tsx
git commit -m "feat(inventory): Stock levels + movement history views"
```

---

## Task 9: `StockScreen` + wire tab/route

**Files:** Create `src/screens/Stock/StockScreen.tsx`, Modify `src/App.tsx`, `src/components/TabBar.tsx`

- [ ] **Step 1: Create the hub screen**

```tsx
// src/screens/Stock/StockScreen.tsx
import { useState } from "react";
import { MovementModal } from "./MovementModal";
import { StockLevels } from "./StockLevels";
import { MovementHistory } from "./MovementHistory";

export function StockScreen() {
  const [movement, setMovement] = useState<"IN" | "OUT" | null>(null);
  const [tab, setTab] = useState<"levels" | "history">("levels");

  const seg = (active: boolean) =>
    `flex-1 rounded-lg py-1.5 text-sm font-semibold ${active ? "bg-brand-accent-2 text-white" : "text-brand-ink"}`;

  return (
    <div className="min-h-screen bg-brand-cream text-brand-ink">
      <header className="px-4 pt-5 pb-2">
        <div className="text-xs font-bold uppercase tracking-widest text-brand-mute">U&amp;M StockHub</div>
        <h1 className="text-xl font-bold">Stock</h1>
        <p className="text-sm text-brand-mute">Receive, issue, and track inventory</p>
      </header>

      <main className="px-4 pb-24 max-w-md mx-auto space-y-4">
        <div className="flex gap-2">
          <button onClick={() => setMovement("IN")} className="flex-1 rounded-xl bg-brand-ok text-white font-semibold py-3 text-sm">📥 Stock IN</button>
          <button onClick={() => setMovement("OUT")} className="flex-1 rounded-xl bg-brand-bad text-white font-semibold py-3 text-sm">📤 Stock OUT</button>
        </div>

        <div className="flex gap-1 bg-brand-accent-soft/50 rounded-xl p-1">
          <button onClick={() => setTab("levels")} className={seg(tab === "levels")}>Stock levels</button>
          <button onClick={() => setTab("history")} className={seg(tab === "history")}>History</button>
        </div>

        <section className="bg-white border border-brand-line rounded-xl p-2">
          {tab === "levels" ? <StockLevels /> : <MovementHistory />}
        </section>
      </main>

      {movement && <MovementModal type={movement} onClose={() => setMovement(null)} />}
    </div>
  );
}
```

- [ ] **Step 2: Add the route in `src/App.tsx`**

Add after the `SettingsScreen` import:

```tsx
import { StockScreen } from "@/screens/Stock/StockScreen";
```

Add after the `/transfers` route line:

```tsx
            <Route path="/stock" element={protect(<StockScreen />)} />
```

- [ ] **Step 3: Add the tab in `src/components/TabBar.tsx`**

Replace the `TABS` array with:

```tsx
const TABS = [
  { to: "/capture", label: "Capture", icon: "📷" },
  { to: "/items", label: "Items", icon: "📦" },
  { to: "/transfers", label: "Transfers", icon: "🔄" },
  { to: "/stock", label: "Stock", icon: "📊" },
  { to: "/dashboard", label: "Find", icon: "🔍" },
  { to: "/barcodes", label: "Barcodes", icon: "🏷️" },
  { to: "/settings", label: "Settings", icon: "⚙️" },
];
```

- [ ] **Step 4: Typecheck + build**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run build`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/screens/Stock/StockScreen.tsx src/App.tsx src/components/TabBar.tsx
git commit -m "feat(inventory): Stock hub screen + tab/route"
```

---

## Task 10: Dashboard Alerts panel (manager/admin)

**Files:** Modify `src/screens/Dashboard/DashboardScreen.tsx`

- [ ] **Step 1: Add imports**

After the existing `import { useEntries } …` line, add:

```tsx
import { useMovements } from "@/hooks/useMovements";
import { useAuth } from "@/hooks/useAuth";
import { emptyLocations, discrepancies } from "@/lib/stockLevels";
```

- [ ] **Step 2: Compute the alerts inside `DashboardScreen`**

After the line `const { data: entries = [], isLoading } = useEntries();`, add:

```tsx
  const { data: movements = [] } = useMovements();
  const { isManager } = useAuth();
  const empties = useMemo(() => emptyLocations(entries), [entries]);
  const discreps = useMemo(() => discrepancies(movements).slice(0, 8), [movements]);
```

- [ ] **Step 3: Render the panel as the first item in `<main>`**

Immediately after the `<main className="px-4 pb-24 max-w-md mx-auto space-y-4">` opening tag, add:

```tsx
        {isManager && (empties.length > 0 || discreps.length > 0) && (
          <section className="bg-white border-2 border-brand-warn/50 rounded-xl p-4">
            <h2 className="text-xs font-bold uppercase tracking-wide text-brand-warn mb-2">⚠ Alerts</h2>
            {empties.length > 0 && (
              <div className="mb-3">
                <div className="text-[11px] font-bold text-brand-bad mb-1">Empty locations ({empties.length})</div>
                <ul className="text-sm space-y-0.5">
                  {empties.slice(0, 8).map((x) => (
                    <li key={x.shelf + x.name} className="truncate">
                      {x.name} · <span className="font-mono text-brand-mute">{x.shelf}</span> — <span className="text-brand-bad">empty</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {discreps.length > 0 && (
              <div>
                <div className="text-[11px] font-bold text-brand-bad mb-1">Recent discrepancies ({discreps.length})</div>
                <ul className="text-sm space-y-0.5">
                  {discreps.map((d) => (
                    <li key={d.id} className="truncate">
                      <span className="font-mono text-xs">{d.ref}</span> · {d.name} @ <span className="font-mono">{d.shelf}</span> — issued {d.requested}, only {d.available} on hand
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
```

- [ ] **Step 4: Typecheck + build**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run build`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/screens/Dashboard/DashboardScreen.tsx
git commit -m "feat(inventory): manager Alerts panel (empty locations + discrepancies)"
```

---

## Task 11: full verification

- [ ] **Step 1: Typecheck, build, and run the whole test suite**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run build`
Expected: "built in …", no errors.
Run: `npx vitest run`
Expected: all tests pass (44 existing + 9 new = 53).

---

## Done — manual verification (after the user runs migration 0010)

1. **Stock tab** 📊 appears (7 tabs); opens the hub with **📥 Stock IN** / **📤 Stock OUT** and a **Stock levels / History** toggle.
2. **Stock IN** → pick item, scan a shelf, qty, supplier → "Stock received". The item's qty at that shelf goes **up** (or a new entry appears if it wasn't there). A `GRN/…` row shows in History.
3. **Stock OUT** within stock → qty goes **down**; `MIR/…` in History.
4. **Stock OUT over available** → confirm prompt; on confirm, entry floors at **0**, History row shows a ⚠ discrepancy ("issued 8, only 5 on hand").
5. **Stock levels** → per-item totals with per-shelf breakdown; a 0-qty shelf shows **empty**, a 0-total item shows **out of stock**.
6. **History → Discrepancies only** filter shows just the flagged OUTs; tap any row → detail.
7. **As a manager**, the **Find/Dashboard** screen shows an **⚠ Alerts** panel listing empty locations + recent discrepancies. As a storekeeper, the panel is hidden.
