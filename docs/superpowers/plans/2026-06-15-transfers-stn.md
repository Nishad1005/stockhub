# Transfers + STN Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Transfers screen — record a stock movement between two shelves, produce an `STN/YYYY-MM/NNNN` note, decrement the source entry, and create a destination entry (so the item shows at its new shelf in Items/Find).

**Architecture:** Pure frontend — the `transfers` table, `next_stn_number()` sequence, and RLS already shipped in migration `0001`. Two React Query hooks (`useTransfers` read, `useCreateTransfer` write), two pure lib helpers (`transferStats`, `findSourceEntry`) with a Zod validator, and three UI files under `src/screens/Transfers/`. Zone auto-derives from the scanned shelf (CLAUDE.md §5.2); shelves are scan-only unless manager manual-entry mode is on (§5.4).

**Tech Stack:** React 18 + TypeScript, Vite, TanStack Query v5, Zustand, Zod, Tailwind (brand tokens), Supabase JS, html5-qrcode, Vitest.

---

## File structure

| File | Responsibility |
|------|----------------|
| `src/types/transfer.ts` (modify) | Add `TransferRow` / `TransferInsert` aliases from generated `database.ts`. |
| `src/lib/transferStats.ts` (create) | Pure `transferStats(rows, now?) → { today, week, total }`. |
| `src/lib/transferStats.test.ts` (create) | Unit test for the buckets. |
| `src/lib/transferMatch.ts` (create) | Pure `findSourceEntry(entries, {shelfCode,itemCode,itemName})`. |
| `src/lib/transferMatch.test.ts` (create) | Unit test for the matcher. |
| `src/lib/validators/transfer.ts` (create) | Zod `createTransferSchema` + `CreateTransferInput`. |
| `src/lib/validators/transfer.test.ts` (create) | Unit test for the validator. |
| `src/hooks/useTransfers.ts` (create) | Read all transfers, newest-first. |
| `src/hooks/useCreateTransfer.ts` (create) | The mutation (STN → insert transfer → decrement source → create dest entry). |
| `src/screens/Transfers/TransferDetailModal.tsx` (create) | Read-only STN detail view. |
| `src/screens/Transfers/NewTransferModal.tsx` (create) | The transfer form. |
| `src/screens/Transfers/TransfersScreen.tsx` (create) | Stats header + list + "New Transfer". |
| `src/App.tsx` (modify) | Swap `/transfers` placeholder for `TransfersScreen`. |
| `src/components/TabBar.tsx` (modify) | Add the Transfers tab. |

---

## Task 1: `transferStats` helper

**Files:**
- Create: `src/lib/transferStats.ts`
- Test: `src/lib/transferStats.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/transferStats.test.ts
import { describe, it, expect } from "vitest";
import { transferStats } from "./transferStats";

// Fixed "now": 2026-06-15 12:00 local.
const NOW = new Date(2026, 5, 15, 12, 0, 0).getTime();
const at = (d: Date) => ({ created_at: d.toISOString() });

describe("transferStats", () => {
  it("counts today, last 7 days, and total", () => {
    const rows = [
      at(new Date(2026, 5, 15, 9, 0)),   // today
      at(new Date(2026, 5, 15, 1, 0)),   // today (earlier)
      at(new Date(2026, 5, 12, 9, 0)),   // 3 days ago → in week, not today
      at(new Date(2026, 5, 1, 9, 0)),    // 14 days ago → only total
    ];
    expect(transferStats(rows, NOW)).toEqual({ today: 2, week: 3, total: 4 });
  });

  it("is zero on an empty list", () => {
    expect(transferStats([], NOW)).toEqual({ today: 0, week: 0, total: 0 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/transferStats.test.ts`
Expected: FAIL — "Failed to resolve import './transferStats'".

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/transferStats.ts
/** Header counts for the Transfers screen — ports v0.1 renderTransfersScreen stats. */
export interface TransferStats {
  today: number;
  week: number;
  total: number;
}

/**
 * Bucket transfers by capture time. `week` is the last 7 days (matches v0.1:
 * `new Date(y, m, d - 7)`). `nowMs` is injectable so tests are deterministic.
 */
export function transferStats(
  rows: ReadonlyArray<{ created_at: string }>,
  nowMs: number = Date.now(),
): TransferStats {
  const now = new Date(nowMs);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).getTime();
  let today = 0;
  let week = 0;
  for (const r of rows) {
    const ts = new Date(r.created_at).getTime();
    if (ts >= todayStart) today++;
    if (ts >= weekStart) week++;
  }
  return { today, week, total: rows.length };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/transferStats.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/transferStats.ts src/lib/transferStats.test.ts
git commit -m "feat(transfers): transferStats helper"
```

---

## Task 2: `findSourceEntry` matcher

**Files:**
- Create: `src/lib/transferMatch.ts`
- Test: `src/lib/transferMatch.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/transferMatch.test.ts
import { describe, it, expect } from "vitest";
import { findSourceEntry } from "./transferMatch";
import type { EntryRow } from "@/types/entry";

const mk = (p: Partial<EntryRow> & { id: string }): EntryRow =>
  ({
    id: p.id,
    created_at: "2026-06-15T00:00:00Z",
    updated_at: "2026-06-15T00:00:00Z",
    created_by: "u1",
    zone_code: "Z01",
    shelf_code: "Z1-S001",
    fixture_type: "S",
    name: "Thread Mara 30",
    master_code: null,
    assigned_code: null,
    defn: null,
    category: null,
    qty: null,
    notes: null,
    photo_url: null,
    scanned_barcode: null,
    ...p,
  }) as EntryRow;

describe("findSourceEntry", () => {
  const entries = [
    mk({ id: "a", shelf_code: "Z1-S001", master_code: "ITM-00042", name: "Foam" }),
    mk({ id: "b", shelf_code: "Z1-S001", master_code: null, name: "Loose Cloth" }),
    mk({ id: "c", shelf_code: "Z2-S009", master_code: "ITM-00042", name: "Foam" }),
  ];

  it("matches on shelf + master code", () => {
    expect(findSourceEntry(entries, { shelfCode: "Z1-S001", itemCode: "ITM-00042", itemName: "Foam" })?.id).toBe("a");
  });

  it("matches on shelf + name when there is no code", () => {
    expect(findSourceEntry(entries, { shelfCode: "Z1-S001", itemCode: null, itemName: "loose cloth" })?.id).toBe("b");
  });

  it("returns null when nothing on that shelf matches", () => {
    expect(findSourceEntry(entries, { shelfCode: "Z9-S099", itemCode: "ITM-00042", itemName: "Foam" })).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/transferMatch.test.ts`
Expected: FAIL — "Failed to resolve import './transferMatch'".

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/transferMatch.ts
import type { EntryRow } from "@/types/entry";

export interface SourceMatchQuery {
  shelfCode: string;
  itemCode: string | null;
  itemName: string;
}

/**
 * Find the entry at the source shelf that this transfer is moving — the v0.2
 * analogue of v0.1 checkSourceEntry(). Matches on shelf (more specific than
 * v0.1, which used zone) plus master code when known, else name (case-insensitive).
 * Returns the first match, or null (then the transfer is logged audit-only).
 */
export function findSourceEntry(
  entries: ReadonlyArray<EntryRow>,
  q: SourceMatchQuery,
): EntryRow | null {
  const shelf = (q.shelfCode || "").trim().toUpperCase();
  if (!shelf) return null;
  const name = (q.itemName || "").trim().toLowerCase();
  for (const e of entries) {
    if ((e.shelf_code || "").toUpperCase() !== shelf) continue;
    if (q.itemCode) {
      if (e.master_code === q.itemCode) return e;
    } else if (name && (e.name || "").trim().toLowerCase() === name) {
      return e;
    }
  }
  return null;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/transferMatch.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/transferMatch.ts src/lib/transferMatch.test.ts
git commit -m "feat(transfers): findSourceEntry matcher"
```

---

## Task 3: Transfer validator

**Files:**
- Create: `src/lib/validators/transfer.ts`
- Test: `src/lib/validators/transfer.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/validators/transfer.test.ts
import { describe, it, expect } from "vitest";
import { createTransferSchema } from "./transfer";

const base = {
  itemName: "Foam Platinum",
  sourceShelf: "Z1-S001",
  destShelf: "Z2-S012",
  qty: "5",
};

describe("createTransferSchema", () => {
  it("accepts a valid transfer and coerces qty to a number", () => {
    const v = createTransferSchema.parse(base);
    expect(v.qty).toBe(5);
    expect(v.itemCode).toBeNull();
  });

  it("rejects a missing item name", () => {
    expect(() => createTransferSchema.parse({ ...base, itemName: "   " })).toThrow();
  });

  it("rejects qty of zero", () => {
    expect(() => createTransferSchema.parse({ ...base, qty: "0" })).toThrow();
  });

  it("rejects an invalid shelf code", () => {
    expect(() => createTransferSchema.parse({ ...base, destShelf: "NOPE" })).toThrow();
  });

  it("rejects identical source and destination", () => {
    expect(() => createTransferSchema.parse({ ...base, destShelf: "z1-s001" })).toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/validators/transfer.test.ts`
Expected: FAIL — "Failed to resolve import './transfer'".

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/validators/transfer.ts
/**
 * Transfer validation — mirrors v0.1 saveTransfer() guards:
 *  - item name required
 *  - source & destination shelves valid (SHELF_RE) and not identical
 *  - qty an integer >= 1
 *  - reason / storekeeper / helper optional
 */
import { z } from "zod";
import { requiredName, optionalText } from "./entry";
import { validateShelf, normaliseShelf } from "@/lib/shelf-validator";

/** Quantity to transfer: parsed to an integer >= 1 (v0.1 used parseInt + > 0). */
const transferQty = z.preprocess(
  (v) => {
    if (v === "" || v === null || v === undefined) return Number.NaN;
    const n = typeof v === "number" ? Math.trunc(v) : parseInt(String(v).trim(), 10);
    return Number.isFinite(n) ? n : Number.NaN;
  },
  z
    .number({ invalid_type_error: "Quantity must be a whole number" })
    .int("Quantity must be a whole number")
    .positive("Quantity must be 1 or more"),
);

export const createTransferSchema = z
  .object({
    itemName: requiredName,
    itemCode: optionalText.optional().default(null),
    itemDefn: optionalText.optional().default(null),
    itemCategory: optionalText.optional().default(null),
    sourceShelf: z.string().min(1, "Source shelf is required"),
    destShelf: z.string().min(1, "Destination shelf is required"),
    qty: transferQty,
    reason: optionalText.optional().default(null),
    storekeeper: optionalText.optional().default(null),
    helper: optionalText.optional().default(null),
  })
  .superRefine((val, ctx) => {
    if (!validateShelf(val.sourceShelf).ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["sourceShelf"], message: "Invalid source shelf code" });
    }
    if (!validateShelf(val.destShelf).ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["destShelf"], message: "Invalid destination shelf code" });
    }
    if (normaliseShelf(val.sourceShelf) === normaliseShelf(val.destShelf)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["destShelf"], message: "Source and destination cannot be identical" });
    }
  });

export type CreateTransferInput = z.input<typeof createTransferSchema>;
export type CreateTransferValues = z.output<typeof createTransferSchema>;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/validators/transfer.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/validators/transfer.ts src/lib/validators/transfer.test.ts
git commit -m "feat(transfers): createTransferSchema validator"
```

---

## Task 4: Type aliases + `useTransfers` read hook

**Files:**
- Modify: `src/types/transfer.ts`
- Create: `src/hooks/useTransfers.ts`

- [ ] **Step 1: Add Row/Insert aliases to the transfer type**

Append to `src/types/transfer.ts` (keep the existing `Transfer` interface):

```typescript
import type { Database } from "./database";

/** Generated row/insert shapes — the single source of truth for the DB. */
export type TransferRow = Database["public"]["Tables"]["transfers"]["Row"];
export type TransferInsert = Database["public"]["Tables"]["transfers"]["Insert"];
```

- [ ] **Step 2: Create the read hook**

```typescript
// src/hooks/useTransfers.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { TransferRow } from "@/types/transfer";

export const transfersKeys = {
  all: ["transfers"] as const,
};

const PAGE = 1000; // Supabase caps a single select at 1000 rows

async function fetchAllTransfers(): Promise<TransferRow[]> {
  const all: TransferRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("transfers")
      .select("*")
      .order("created_at", { ascending: false }) // newest first (v0.1 list order)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...(data as TransferRow[]));
    if (data.length < PAGE) break;
  }
  return all;
}

/** All STN transfers, newest first. */
export function useTransfers() {
  return useQuery({
    queryKey: transfersKeys.all,
    queryFn: fetchAllTransfers,
  });
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/transfer.ts src/hooks/useTransfers.ts
git commit -m "feat(transfers): TransferRow/Insert aliases + useTransfers hook"
```

---

## Task 5: `useCreateTransfer` write hook

**Files:**
- Create: `src/hooks/useCreateTransfer.ts`

- [ ] **Step 1: Create the mutation hook**

```typescript
// src/hooks/useCreateTransfer.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { validateShelf } from "@/lib/shelf-validator";
import { createTransferSchema, type CreateTransferInput } from "@/lib/validators/transfer";
import type { TransferRow, TransferInsert } from "@/types/transfer";
import type { EntryInsert } from "@/types/entry";
import { entriesKeys } from "./useEntries";
import { transfersKeys } from "./useTransfers";

export interface CreateTransferArgs {
  input: CreateTransferInput;
  /** Source entry to decrement (from findSourceEntry in the modal), or null. */
  sourceEntryId: string | null;
}

/**
 * Record a transfer — ports v0.1 saveTransfer(). Moves the stock (the user chose
 * this): inserts an STN transfer row, decrements the matched source entry, and
 * creates a destination entry so the item shows at its new shelf in Items/Find.
 * Zones are derived from the scanned shelves (CLAUDE.md §5.2). STN comes from the
 * server-side next_stn_number() sequence (monotonic across devices).
 */
export function useCreateTransfer() {
  const qc = useQueryClient();
  return useMutation<TransferRow, Error, CreateTransferArgs>({
    mutationFn: async ({ input, sourceEntryId }) => {
      const v = createTransferSchema.parse(input);

      const src = validateShelf(v.sourceShelf);
      const dst = validateShelf(v.destShelf);
      if (!src.ok || !src.code || !src.zoneCode || !dst.ok || !dst.code || !dst.zoneCode || !dst.fixtureType) {
        throw new Error("Invalid source or destination shelf code");
      }

      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("You must be signed in to record a transfer.");

      // 1. STN number (server sequence)
      const { data: stn, error: stnErr } = await supabase.rpc("next_stn_number");
      if (stnErr) throw stnErr;
      if (!stn) throw new Error("No STN number returned by next_stn_number()");

      // 2. Insert the transfer (audit record)
      const row: TransferInsert = {
        created_by: uid,
        stn_number: stn,
        item_code: v.itemCode,
        item_name: v.itemName,
        item_defn: v.itemDefn,
        item_category: v.itemCategory,
        source_zone: src.zoneCode,
        source_shelf: src.code,
        dest_zone: dst.zoneCode,
        dest_shelf: dst.code,
        qty: v.qty,
        reason: v.reason,
        storekeeper: v.storekeeper,
        helper: v.helper,
        source_deducted: !!sourceEntryId,
        notes: null,
      };
      const { data: tr, error: trErr } = await supabase.from("transfers").insert(row).select().single();
      if (trErr) throw trErr;

      // 3. Decrement the source entry (only when one was matched and it has a qty)
      if (sourceEntryId) {
        const { data: srcEntry } = await supabase
          .from("entries")
          .select("qty")
          .eq("id", sourceEntryId)
          .single();
        if (srcEntry && srcEntry.qty != null) {
          const newQty = Math.max(0, srcEntry.qty - v.qty);
          const { error: decErr } = await supabase.from("entries").update({ qty: newQty }).eq("id", sourceEntryId);
          if (decErr) throw decErr;
        }
      }

      // 4. Create the destination entry (so the item shows at its new shelf)
      const destEntry: EntryInsert = {
        created_by: uid,
        zone_code: dst.zoneCode,
        shelf_code: dst.code,
        fixture_type: dst.fixtureType,
        name: v.itemName,
        master_code: v.itemCode,
        assigned_code: null,
        defn: v.itemDefn,
        category: v.itemCategory,
        qty: v.qty,
        notes: `Transferred from ${src.code} · ${stn}`,
        photo_url: null,
        scanned_barcode: null,
      };
      const { error: destErr } = await supabase.from("entries").insert(destEntry);
      if (destErr) throw destErr;

      return tr as TransferRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: transfersKeys.all });
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
git add src/hooks/useCreateTransfer.ts
git commit -m "feat(transfers): useCreateTransfer mutation"
```

---

## Task 6: `TransferDetailModal`

**Files:**
- Create: `src/screens/Transfers/TransferDetailModal.tsx`

- [ ] **Step 1: Create the modal**

```tsx
// src/screens/Transfers/TransferDetailModal.tsx
import { ZONE_INDEX } from "@/constants/zones";
import type { TransferRow } from "@/types/transfer";

export interface TransferDetailModalProps {
  transfer: TransferRow;
  onClose: () => void;
}

/** Read-only STN detail — ports v0.1 openTransferDetail(). */
export function TransferDetailModal({ transfer: t, onClose }: TransferDetailModalProps) {
  const zoneName = (code: string) => ZONE_INDEX[code]?.name ?? code;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-2xl p-5 max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-mono font-bold text-brand-accent-2">{t.stn_number}</h2>
          <button onClick={onClose} className="text-brand-mute text-lg leading-none px-1">✕</button>
        </div>

        <div className="text-xs text-brand-mute mb-3">{new Date(t.created_at).toLocaleString()}</div>

        <div className="mb-3">
          <div className="text-[10px] font-bold uppercase tracking-wide text-brand-mute">Item</div>
          <div className="text-sm font-medium text-brand-ink">
            {t.item_code && (
              <span className="mr-1.5 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-brand-ok/15 text-brand-ok">
                {t.item_code}
              </span>
            )}
            {t.item_name}
          </div>
          {(t.item_defn || t.item_category) && (
            <div className="text-xs text-brand-mute">{[t.item_defn, t.item_category].filter(Boolean).join(" · ")}</div>
          )}
        </div>

        <div className="flex items-stretch gap-2 mb-3">
          <div className="flex-1 rounded-lg bg-brand-bad/10 p-3">
            <div className="text-[10px] font-bold uppercase tracking-wide text-brand-bad">From</div>
            <div className="font-mono font-bold text-brand-bad">{t.source_zone}</div>
            <div className="text-xs text-brand-mute">{zoneName(t.source_zone)}</div>
            <div className="text-xs font-mono text-brand-ink mt-1">{t.source_shelf}</div>
          </div>
          <div className="flex items-center text-brand-accent-2 text-xl">→</div>
          <div className="flex-1 rounded-lg bg-brand-ok/10 p-3">
            <div className="text-[10px] font-bold uppercase tracking-wide text-brand-ok">To</div>
            <div className="font-mono font-bold text-brand-ok">{t.dest_zone}</div>
            <div className="text-xs text-brand-mute">{zoneName(t.dest_zone)}</div>
            <div className="text-xs font-mono text-brand-ink mt-1">{t.dest_shelf}</div>
          </div>
        </div>

        <div className="mb-3">
          <div className="text-[10px] font-bold uppercase tracking-wide text-brand-mute">Quantity</div>
          <div className="font-mono text-2xl font-bold text-brand-accent-2">{t.qty}</div>
          <div className="text-xs mt-0.5">
            {t.source_deducted ? (
              <span className="text-brand-ok">✓ Deducted from source entry</span>
            ) : (
              <span className="text-brand-warn">⚠ Audit-only (no source entry found to deduct)</span>
            )}
          </div>
        </div>

        {t.reason && (
          <div className="mb-3">
            <div className="text-[10px] font-bold uppercase tracking-wide text-brand-mute">Reason</div>
            <div className="text-sm text-brand-ink">{t.reason}</div>
          </div>
        )}

        {(t.storekeeper || t.helper) && (
          <div className="rounded-lg bg-brand-cream p-3 text-xs">
            <div className="text-[10px] font-bold uppercase tracking-wide text-brand-mute mb-1">Signatures</div>
            {t.storekeeper && <div><b>Storekeeper:</b> {t.storekeeper}</div>}
            {t.helper && <div><b>Helper:</b> {t.helper}</div>}
          </div>
        )}

        <button onClick={onClose} className="mt-4 w-full rounded-lg border border-brand-line py-2 text-sm font-semibold">
          Close
        </button>
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
git add src/screens/Transfers/TransferDetailModal.tsx
git commit -m "feat(transfers): TransferDetailModal"
```

---

## Task 7: `NewTransferModal`

**Files:**
- Create: `src/screens/Transfers/NewTransferModal.tsx`

- [ ] **Step 1: Create the form modal**

```tsx
// src/screens/Transfers/NewTransferModal.tsx
import { useMemo, useState } from "react";
import { MasterSearch } from "@/components/MasterSearch";
import { CameraScanner } from "@/components/CameraScanner";
import { useEntries } from "@/hooks/useEntries";
import { useCreateTransfer } from "@/hooks/useCreateTransfer";
import { useSessionStore } from "@/stores/session";
import { findSourceEntry } from "@/lib/transferMatch";
import { validateShelf } from "@/lib/shelf-validator";
import { ZONE_INDEX } from "@/constants/zones";
import { toast } from "@/stores/toast";
import { errMessage } from "@/lib/errors";
import type { MasterItem } from "@/types/master";

export interface NewTransferModalProps {
  onClose: () => void;
}

type ScanTarget = "source" | "dest" | null;

/** Record a new transfer — ports v0.1 openTransferModal + saveTransfer. */
export function NewTransferModal({ onClose }: NewTransferModalProps) {
  const { data: entries = [] } = useEntries();
  const create = useCreateTransfer();
  const manualEntryMode = useSessionStore((s) => s.manualEntryMode);

  const [itemName, setItemName] = useState("");
  const [itemCode, setItemCode] = useState<string | null>(null);
  const [itemDefn, setItemDefn] = useState<string | null>(null);
  const [itemCategory, setItemCategory] = useState<string | null>(null);
  const [sourceShelf, setSourceShelf] = useState("");
  const [destShelf, setDestShelf] = useState("");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [storekeeper, setStorekeeper] = useState("");
  const [helper, setHelper] = useState("");
  const [scan, setScan] = useState<ScanTarget>(null);

  const sourceZone = validateShelf(sourceShelf).zoneCode;
  const destZone = validateShelf(destShelf).zoneCode;

  const sourceMatch = useMemo(
    () => findSourceEntry(entries, { shelfCode: sourceShelf, itemCode, itemName }),
    [entries, sourceShelf, itemCode, itemName],
  );

  function pick(it: MasterItem) {
    setItemName(it.name);
    setItemCode(it.code);
    setItemDefn(it.definition);
    setItemCategory(it.category);
  }
  function onItemNameChange(v: string) {
    setItemName(v);
    if (itemCode) setItemCode(null); // typing a fresh name clears a prior match
  }

  function onScanDetected(decoded: string) {
    const target = scan;
    setScan(null);
    const v = validateShelf(decoded);
    if (!v.ok || !v.code) {
      toast(`Not a location code: ${decoded}`, "warn");
      return;
    }
    if (target === "source") setSourceShelf(v.code);
    else if (target === "dest") setDestShelf(v.code);
  }

  async function save() {
    const qNum = parseInt(qty.trim(), 10);
    if (sourceMatch && sourceMatch.qty != null && Number.isFinite(qNum) && qNum > sourceMatch.qty) {
      if (!window.confirm(`Transferring ${qNum} but source only has ${sourceMatch.qty}. Proceed anyway?`)) return;
    }
    try {
      await create.mutateAsync({
        input: { itemName, itemCode, itemDefn, itemCategory, sourceShelf, destShelf, qty, reason, storekeeper, helper },
        sourceEntryId: sourceMatch?.id ?? null,
      });
      toast("Transfer saved", "ok");
      onClose();
    } catch (e) {
      toast("Transfer failed: " + errMessage(e), "warn");
    }
  }

  const field =
    "w-full rounded-lg border border-brand-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent read-only:bg-brand-cream";
  const shelfField = `${field} font-mono font-bold uppercase tracking-wide`;

  return (
    <div className="fixed inset-0 z-40 bg-black/60 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-2xl p-5 max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-brand-ink">New Transfer (STN)</h2>
          <button onClick={onClose} className="text-brand-mute text-lg leading-none px-1">✕</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-brand-mute mb-1">
              Item <span className="text-brand-bad">*</span>
            </label>
            <MasterSearch value={itemName} onChange={onItemNameChange} onPick={pick} />
            {itemCode && (
              <span className="inline-block mt-1.5 text-xs font-semibold rounded px-2 py-0.5 bg-brand-ok text-white">
                ✓ {itemCode}
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-brand-bad mb-1">From shelf *</label>
              <div className="flex gap-1">
                <input
                  value={sourceShelf}
                  readOnly={!manualEntryMode}
                  onChange={(e) => setSourceShelf(e.target.value.toUpperCase())}
                  placeholder={manualEntryMode ? "Z1-S047" : "Scan →"}
                  className={shelfField}
                />
                <button onClick={() => setScan("source")} className="rounded-lg bg-brand-accent-2 text-white px-3 text-sm">📷</button>
              </div>
              {sourceZone && <div className="text-[11px] text-brand-mute mt-0.5">{sourceZone} · {ZONE_INDEX[sourceZone]?.name}</div>}
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-brand-ok mb-1">To shelf *</label>
              <div className="flex gap-1">
                <input
                  value={destShelf}
                  readOnly={!manualEntryMode}
                  onChange={(e) => setDestShelf(e.target.value.toUpperCase())}
                  placeholder={manualEntryMode ? "Z2-S012" : "Scan →"}
                  className={shelfField}
                />
                <button onClick={() => setScan("dest")} className="rounded-lg bg-brand-accent-2 text-white px-3 text-sm">📷</button>
              </div>
              {destZone && <div className="text-[11px] text-brand-mute mt-0.5">{destZone} · {ZONE_INDEX[destZone]?.name}</div>}
            </div>
          </div>

          {sourceShelf && (itemCode || itemName.trim()) && (
            <div className={`text-xs rounded-lg p-2 ${sourceMatch ? "bg-brand-ok/10 text-brand-ok" : "bg-brand-warn/10 text-brand-warn"}`}>
              {sourceMatch
                ? `✓ Found at source — qty available: ${sourceMatch.qty ?? "—"}. Will deduct on save.`
                : "⚠ No matching entry at source — will log as audit only."}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-brand-mute mb-1">
              Quantity <span className="text-brand-bad">*</span>
            </label>
            <input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="—" className={field} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-brand-mute mb-1">Reason</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Reallocation for production" className={field} />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-brand-mute mb-1">Storekeeper</label>
              <input value={storekeeper} onChange={(e) => setStorekeeper(e.target.value)} className={field} />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-brand-mute mb-1">Helper</label>
              <input value={helper} onChange={(e) => setHelper(e.target.value)} className={field} />
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 rounded-lg border border-brand-line py-2 text-sm font-semibold">Cancel</button>
          <button onClick={save} disabled={create.isPending} className="flex-1 rounded-lg bg-brand-accent-2 text-white py-2 text-sm font-semibold disabled:opacity-60">
            {create.isPending ? "Saving…" : "Save transfer"}
          </button>
        </div>
      </div>

      <CameraScanner
        open={scan !== null}
        title={scan === "source" ? "Scan SOURCE shelf" : "Scan DESTINATION shelf"}
        onClose={() => setScan(null)}
        onDetected={onScanDetected}
      />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/screens/Transfers/NewTransferModal.tsx
git commit -m "feat(transfers): NewTransferModal form"
```

---

## Task 8: `TransfersScreen`

**Files:**
- Create: `src/screens/Transfers/TransfersScreen.tsx`

- [ ] **Step 1: Create the screen**

```tsx
// src/screens/Transfers/TransfersScreen.tsx
import { useMemo, useState } from "react";
import { useTransfers } from "@/hooks/useTransfers";
import { transferStats } from "@/lib/transferStats";
import { NewTransferModal } from "./NewTransferModal";
import { TransferDetailModal } from "./TransferDetailModal";
import type { TransferRow } from "@/types/transfer";

export function TransfersScreen() {
  const { data: transfers = [], isLoading, error } = useTransfers();
  const [showNew, setShowNew] = useState(false);
  const [detail, setDetail] = useState<TransferRow | null>(null);

  const stats = useMemo(() => transferStats(transfers), [transfers]);

  return (
    <div className="min-h-screen bg-brand-cream text-brand-ink">
      <header className="px-4 pt-5 pb-2">
        <div className="text-xs font-bold uppercase tracking-widest text-brand-mute">U&amp;M StockHub</div>
        <h1 className="text-xl font-bold">Transfers</h1>
        <p className="text-sm text-brand-mute">Move stock between shelves with an STN audit trail</p>
      </header>

      <main className="px-4 pb-24 max-w-md mx-auto space-y-4">
        <section className="bg-white border border-brand-line rounded-xl p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold uppercase tracking-wide text-brand-mute">
              {stats.total} transfer{stats.total === 1 ? "" : "s"}
            </span>
            <button onClick={() => setShowNew(true)} className="rounded-lg bg-brand-accent-2 text-white font-semibold px-3 py-1.5 text-sm">
              ＋ New Transfer
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { n: stats.today, l: "Today" },
              { n: stats.week, l: "This week" },
              { n: stats.total, l: "Total" },
            ].map((s) => (
              <div key={s.l} className="rounded-lg bg-brand-accent-soft/50 p-3 text-center">
                <div className="text-2xl font-bold font-mono text-brand-ink">{s.n}</div>
                <div className="text-[10px] uppercase tracking-wide text-brand-mute">{s.l}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-brand-line rounded-xl p-2">
          {isLoading && <p className="text-sm text-brand-mute p-3 text-center">Loading…</p>}
          {error && <p className="text-sm text-brand-bad p-3 text-center">Failed to load transfers.</p>}
          {!isLoading && !error && transfers.length === 0 && (
            <p className="text-sm text-brand-mute p-6 text-center">
              🔄 No transfers yet. Tap “＋ New Transfer” to record your first stock movement.
            </p>
          )}
          <ul className="divide-y divide-brand-line">
            {transfers.map((t) => (
              <li key={t.id}>
                <button onClick={() => setDetail(t)} className="w-full text-left p-2 flex items-center gap-3">
                  <div className="font-mono text-[10px] font-bold text-brand-accent-2 w-12 shrink-0">
                    {t.stn_number.split("/").pop()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-brand-ink truncate">
                      {t.item_code && (
                        <span className="mr-1 text-[10px] font-mono font-bold px-1 py-0.5 rounded bg-brand-ok/15 text-brand-ok">
                          {t.item_code}
                        </span>
                      )}
                      {t.item_name}
                    </div>
                    <div className="text-xs text-brand-mute truncate">
                      <span className="font-mono text-brand-bad">{t.source_shelf}</span>
                      <span className="mx-1">→</span>
                      <span className="font-mono text-brand-ok">{t.dest_shelf}</span>
                      <span className="text-brand-mute"> · {new Date(t.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="font-mono font-bold text-brand-ink shrink-0">{t.qty}</div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </main>

      {showNew && <NewTransferModal onClose={() => setShowNew(false)} />}
      {detail && <TransferDetailModal transfer={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/screens/Transfers/TransfersScreen.tsx
git commit -m "feat(transfers): TransfersScreen"
```

---

## Task 9: Wire route + tab

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/TabBar.tsx`

- [ ] **Step 1: Import the screen in `src/App.tsx`**

Add to the imports (after the `DashboardScreen` import on line 13):

```tsx
import { TransfersScreen } from "@/screens/Transfers/TransfersScreen";
```

- [ ] **Step 2: Swap the placeholder route in `src/App.tsx`**

Replace this line:

```tsx
            <Route path="/transfers" element={protect(<Placeholder name="Transfers" />)} />
```

with:

```tsx
            <Route path="/transfers" element={protect(<TransfersScreen />)} />
```

- [ ] **Step 3: Add the Transfers tab in `src/components/TabBar.tsx`**

Replace the `TABS` array with:

```tsx
const TABS = [
  { to: "/capture", label: "Capture", icon: "📷" },
  { to: "/items", label: "Items", icon: "📦" },
  { to: "/transfers", label: "Transfers", icon: "🔄" },
  { to: "/dashboard", label: "Find", icon: "🔍" },
  { to: "/barcodes", label: "Barcodes", icon: "🏷️" },
];
```

- [ ] **Step 4: Typecheck, build, and run the full test suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run build`
Expected: "built in …", no errors.

Run: `npx vitest run`
Expected: all tests pass (29 existing + 10 new = 39).

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components/TabBar.tsx
git commit -m "feat(transfers): wire /transfers route + Transfers tab"
```

---

## Done — manual verification (on the Netlify HTTPS URL, for camera)

1. **Transfers tab** appears between Items and Find; opens the screen.
2. **＋ New Transfer** → type/scan an item, **scan source shelf** (zone auto-fills under it), **scan dest shelf** (zone auto-fills), enter qty → the green/amber **source banner** reflects whether a matching entry exists at the source.
3. **Save** → toast "Transfer saved"; the row appears at the top of the list with its STN.
4. **Items / Find** → the item now shows at the **destination** shelf; the source entry's qty dropped by the transferred amount.
5. Tap a transfer row → **detail** shows FROM → TO, qty, reason, signatures, and whether the source was deducted.
6. Transferring **more than available** prompts a confirm; identical source/dest or an invalid shelf is rejected with a toast.
