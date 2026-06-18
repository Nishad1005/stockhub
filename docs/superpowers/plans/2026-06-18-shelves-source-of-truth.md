# Shelves as Source of Truth — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `shelves` registry (612 real shelves) that warns on unregistered shelf codes in Capture/Transfer/Stock, plus in-app shelf-label PDF (re)printing on the Barcodes screen matching the existing labels.

**Architecture:** A `shelves` table seeded via `generate_series`. `useShelves` loads it (cached forever); `useShelfChecker` returns a known/unknown/loading checker used at the shelf-entry points. `buildShelfLabelsPdf` mirrors the existing item-label jsPDF/JsBarcode code. UI-level warnings; no hard blocks.

**Tech Stack:** React 18 + TS, TanStack Query v5, Supabase, JsBarcode + jsPDF, Vitest.

Spec: `docs/superpowers/specs/2026-06-18-shelves-source-of-truth-design.md`.

---

## File structure

| File | Responsibility |
|------|----------------|
| `src/lib/shelfRegistry.ts` (+ test) | `buildShelfCodeSet`, `isKnownShelf` |
| `supabase/migrations/0014_shelves.sql` | Table + RLS + seed *(user runs)* |
| `src/types/database.ts` (modify) | `shelves` types |
| `src/types/shelf-row.ts` | `ShelfRow` alias |
| `src/hooks/useShelves.ts` | `useShelves()` + `useShelfChecker()` |
| `src/lib/shelfLabelPdf.ts` | `buildShelfLabelsPdf` |
| `src/screens/Barcodes/ShelfLabels.tsx` | Zone picker + download |
| `src/screens/Barcodes/BarcodesScreen.tsx` (modify) | Mount the section |
| `src/screens/Capture/ShelfCard.tsx`, `src/screens/Transfers/NewTransferModal.tsx`, `src/screens/Stock/MovementModal.tsx` (modify) | Unregistered-shelf warning |

---

## Task 1: `shelfRegistry` helper

**Files:** Create `src/lib/shelfRegistry.ts`, Test `src/lib/shelfRegistry.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/shelfRegistry.test.ts
import { describe, it, expect } from "vitest";
import { buildShelfCodeSet, isKnownShelf } from "./shelfRegistry";

describe("shelfRegistry", () => {
  const set = buildShelfCodeSet([{ code: "Z1-S001" }, { code: "z2-g005" }]);

  it("normalizes codes to uppercase in the set", () => {
    expect(set.has("Z1-S001")).toBe(true);
    expect(set.has("Z2-G005")).toBe(true);
  });

  it("matches known codes case/space-insensitively", () => {
    expect(isKnownShelf(set, "z1-s001")).toBe(true);
    expect(isKnownShelf(set, "  Z2-G005 ")).toBe(true);
  });

  it("rejects unknown or empty codes", () => {
    expect(isKnownShelf(set, "Z9-S999")).toBe(false);
    expect(isKnownShelf(set, "")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/shelfRegistry.test.ts`
Expected: FAIL — "Failed to resolve import './shelfRegistry'".

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/shelfRegistry.ts
/** Uppercased set of known shelf codes (for O(1) "is this a real shelf?" checks). */
export function buildShelfCodeSet(rows: ReadonlyArray<{ code: string }>): Set<string> {
  return new Set(rows.map((r) => r.code.trim().toUpperCase()));
}

/** True if `code` (trimmed, uppercased) is a registered shelf. Empty → false. */
export function isKnownShelf(set: Set<string>, code: string): boolean {
  const c = (code || "").trim().toUpperCase();
  return c.length > 0 && set.has(c);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/shelfRegistry.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/shelfRegistry.ts src/lib/shelfRegistry.test.ts
git commit -m "feat(shelves): shelf registry helpers"
```

---

## Task 2: migration + types

**Files:** Create `supabase/migrations/0014_shelves.sql`, `src/types/shelf-row.ts`, Modify `src/types/database.ts`

- [ ] **Step 1: Create the migration**

```sql
-- supabase/migrations/0014_shelves.sql
-- Authoritative registry of physical shelves (612), from the zone label PDFs.
create table shelves (
  code         text primary key check (code ~ '^Z[0-9]+-[SGPR][0-9]+$'),
  zone_code    text not null references zones(code),
  fixture_type fixture_type not null,
  seq          int  not null,
  unique (zone_code, fixture_type, seq)
);

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

- [ ] **Step 2: Hand-add `shelves` types**

In `src/types/database.ts`, add to `Database["public"]["Tables"]` (place immediately before the `transfers` block):

```typescript
      shelves: {
        Row: {
          code: string
          fixture_type: Database["public"]["Enums"]["fixture_type"]
          seq: number
          zone_code: string
        }
        Insert: {
          code: string
          fixture_type: Database["public"]["Enums"]["fixture_type"]
          seq: number
          zone_code: string
        }
        Update: {
          code?: string
          fixture_type?: Database["public"]["Enums"]["fixture_type"]
          seq?: number
          zone_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "shelves_zone_code_fkey"
            columns: ["zone_code"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["code"]
          }
        ]
      }
```

- [ ] **Step 3: Create the type alias**

```typescript
// src/types/shelf-row.ts
import type { Database } from "./database";

export type ShelfRow = Database["public"]["Tables"]["shelves"]["Row"];
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0014_shelves.sql src/types/database.ts src/types/shelf-row.ts
git commit -m "feat(shelves): shelves table + types"
```

- [ ] **Step 6: USER STEP (out-of-band)** — owner runs `npx supabase db push` (applies 0014, seeds 612 rows). Code already compiles against the hand-added types.

---

## Task 3: `useShelves` + `useShelfChecker`

**Files:** Create `src/hooks/useShelves.ts`

- [ ] **Step 1: Create the hooks**

```tsx
// src/hooks/useShelves.ts
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { buildShelfCodeSet, isKnownShelf } from "@/lib/shelfRegistry";
import type { ShelfRow } from "@/types/shelf-row";

export const shelvesKeys = { all: ["shelves"] as const };

const PAGE = 1000;

async function fetchShelves(): Promise<ShelfRow[]> {
  const all: ShelfRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from("shelves").select("*").order("code").range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...(data as ShelfRow[]));
    if (data.length < PAGE) break;
  }
  return all;
}

/** All registered shelves (612; static, cached forever). */
export function useShelves() {
  return useQuery({ queryKey: shelvesKeys.all, queryFn: fetchShelves, staleTime: Infinity, gcTime: Infinity });
}

/** Checker: true = registered, false = unregistered, null = registry loading or empty input. */
export function useShelfChecker() {
  const { data } = useShelves();
  const set = useMemo(() => (data ? buildShelfCodeSet(data) : null), [data]);
  return (code: string): boolean | null => {
    if (!set || !code || !code.trim()) return null;
    return isKnownShelf(set, code);
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useShelves.ts
git commit -m "feat(shelves): useShelves + useShelfChecker"
```

---

## Task 4: shelf-label PDF builder

**Files:** Create `src/lib/shelfLabelPdf.ts`

- [ ] **Step 1: Create the builder**

```typescript
// src/lib/shelfLabelPdf.ts
// One 100×50mm label per page for a zone's shelves — matches the existing shelf
// labels (header, big code, ZONE n, "Shelf k of total", CODE128, code text).
import JsBarcode from "jsbarcode";
import type { ShelfRow } from "@/types/shelf-row";

const W = 100;
const H = 50;
const FIX_ORDER: Record<string, number> = { S: 0, G: 1, P: 2, R: 3 };

function barcodePng(value: string): string {
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, value, { format: "CODE128", width: 2, height: 40, displayValue: false, margin: 0 });
  return canvas.toDataURL("image/png");
}

/** Build + download a PDF of all labels for one zone (ordered by fixture S,G,P,R then seq). */
export async function buildShelfLabelsPdf(zoneCode: string, shelves: ReadonlyArray<ShelfRow>): Promise<void> {
  const list = shelves
    .filter((s) => s.zone_code === zoneCode)
    .sort((a, b) => (FIX_ORDER[a.fixture_type] - FIX_ORDER[b.fixture_type]) || a.seq - b.seq);
  if (!list.length) throw new Error("No shelves for this zone");
  const total = list.length;
  const zoneNum = parseInt(zoneCode.replace(/\D/g, ""), 10);

  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [W, H] });

  list.forEach((s, i) => {
    if (i > 0) pdf.addPage([W, H], "landscape");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.text("U&M DESIGNS · STORE TANAWADA", 4, 6);
    pdf.text("SHELF LOCATION", W - 4, 6, { align: "right" });

    pdf.setFontSize(20);
    pdf.text(s.code, 4, 18);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.text("ZONE " + zoneNum, 4, 25);
    pdf.setFontSize(8);
    pdf.text(`Shelf ${i + 1} of ${total}`, 4, 30);
    pdf.text("Store Tanawada", 4, 34);

    try {
      pdf.addImage(barcodePng(s.code), "PNG", 4, 36, W - 8, 9);
    } catch {
      /* skip barcode if it can't render */
    }

    pdf.setFontSize(8);
    pdf.text(s.code, W / 2, 49, { align: "center" });
  });

  pdf.save(`UM_${zoneCode}_Labels.pdf`);
}
```

- [ ] **Step 2: Typecheck + build**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run build`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/shelfLabelPdf.ts
git commit -m "feat(shelves): shelf-label PDF builder"
```

---

## Task 5: ShelfLabels section + Barcodes wiring

**Files:** Create `src/screens/Barcodes/ShelfLabels.tsx`, Modify `src/screens/Barcodes/BarcodesScreen.tsx`

- [ ] **Step 1: Create the section**

```tsx
// src/screens/Barcodes/ShelfLabels.tsx
import { useMemo, useState } from "react";
import { useShelves } from "@/hooks/useShelves";
import { ZONE_INDEX } from "@/constants/zones";
import { buildShelfLabelsPdf } from "@/lib/shelfLabelPdf";
import { toast } from "@/stores/toast";
import { errMessage } from "@/lib/errors";

export function ShelfLabels() {
  const { data: shelves = [] } = useShelves();
  const [zone, setZone] = useState("");
  const [busy, setBusy] = useState(false);

  const zones = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of shelves) counts.set(s.zone_code, (counts.get(s.zone_code) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [shelves]);

  async function download() {
    if (!zone) {
      toast("Pick a zone", "warn");
      return;
    }
    setBusy(true);
    try {
      await buildShelfLabelsPdf(zone, shelves);
      toast("Shelf labels downloaded", "ok");
    } catch (e) {
      toast("PDF failed: " + errMessage(e), "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bg-white border border-brand-line rounded-xl p-4 mt-4">
      <h2 className="text-xs font-bold uppercase tracking-wide text-brand-mute mb-1">Shelf labels</h2>
      <p className="text-[11px] text-brand-mute mb-2">Reprint a zone's shelf barcodes (matches the existing labels).</p>
      <div className="flex gap-2">
        <select value={zone} onChange={(e) => setZone(e.target.value)} className="flex-1 rounded-lg border border-brand-line px-3 py-2 text-sm">
          <option value="">— choose zone —</option>
          {zones.map(([z, c]) => (
            <option key={z} value={z}>{z} · {ZONE_INDEX[z]?.name ?? z} ({c} shelves)</option>
          ))}
        </select>
        <button onClick={download} disabled={busy || !zone} className="rounded-lg bg-brand-accent-2 text-white font-semibold px-3 text-sm disabled:opacity-50">
          {busy ? "…" : "⬇ PDF"}
        </button>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Mount it on the Barcodes screen**

In `src/screens/Barcodes/BarcodesScreen.tsx`, add the import after the `labels` import:

```tsx
import { ShelfLabels } from "./ShelfLabels";
```

Then add `<ShelfLabels />` as the last element inside `<main>` — replace:

```tsx
        </ul>
      </main>
```

with:

```tsx
        </ul>

        <ShelfLabels />
      </main>
```

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run build`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/screens/Barcodes/ShelfLabels.tsx src/screens/Barcodes/BarcodesScreen.tsx
git commit -m "feat(shelves): shelf-label reprint on Barcodes screen"
```

---

## Task 6: unregistered-shelf warnings

**Files:** Modify `src/screens/Capture/ShelfCard.tsx`, `src/screens/Transfers/NewTransferModal.tsx`, `src/screens/Stock/MovementModal.tsx`

- [ ] **Step 1: Capture — ShelfCard**

In `src/screens/Capture/ShelfCard.tsx`, add the import after the `useSessionStore` import:

```tsx
import { useShelfChecker } from "@/hooks/useShelves";
```

Inside the component, after `const [draft, setDraft] = useState(activeShelf ?? "");`, add:

```tsx
  const checkShelf = useShelfChecker();
```

Then, after the status `</div>` that ends with the "Scan required" block (the `<div className="mt-2 text-xs">…</div>`), add:

```tsx
        {activeShelf && checkShelf(activeShelf) === false && (
          <div className="mt-1 text-xs text-brand-warn">⚠ Not a registered shelf</div>
        )}
```

- [ ] **Step 2: Transfers — NewTransferModal**

In `src/screens/Transfers/NewTransferModal.tsx`, add the import after `import { useSessionStore } …`:

```tsx
import { useShelfChecker } from "@/hooks/useShelves";
```

After `const manualEntryMode = useSessionStore((s) => s.manualEntryMode);`, add:

```tsx
  const checkShelf = useShelfChecker();
```

Replace:

```tsx
              {sourceZone && <div className="text-[11px] text-brand-mute mt-0.5">{sourceZone} · {ZONE_INDEX[sourceZone]?.name}</div>}
```

with:

```tsx
              {sourceZone && <div className="text-[11px] text-brand-mute mt-0.5">{sourceZone} · {ZONE_INDEX[sourceZone]?.name}</div>}
              {checkShelf(sourceShelf) === false && <div className="text-[11px] text-brand-warn mt-0.5">⚠ Not a registered shelf</div>}
```

Replace:

```tsx
              {destZone && <div className="text-[11px] text-brand-mute mt-0.5">{destZone} · {ZONE_INDEX[destZone]?.name}</div>}
```

with:

```tsx
              {destZone && <div className="text-[11px] text-brand-mute mt-0.5">{destZone} · {ZONE_INDEX[destZone]?.name}</div>}
              {checkShelf(destShelf) === false && <div className="text-[11px] text-brand-warn mt-0.5">⚠ Not a registered shelf</div>}
```

- [ ] **Step 3: Stock — MovementModal**

In `src/screens/Stock/MovementModal.tsx`, add the import after `import { useSessionStore } …`:

```tsx
import { useShelfChecker } from "@/hooks/useShelves";
```

After `const manualEntryMode = useSessionStore((s) => s.manualEntryMode);`, add:

```tsx
  const checkShelf = useShelfChecker();
```

Replace:

```tsx
            {zone && <div className="text-[11px] text-brand-mute mt-0.5">{zone} · {ZONE_INDEX[zone]?.name}</div>}
```

with:

```tsx
            {zone && <div className="text-[11px] text-brand-mute mt-0.5">{zone} · {ZONE_INDEX[zone]?.name}</div>}
            {checkShelf(shelfCode) === false && <div className="text-[11px] text-brand-warn mt-0.5">⚠ Not a registered shelf</div>}
```

- [ ] **Step 4: Typecheck + build**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run build`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/screens/Capture/ShelfCard.tsx src/screens/Transfers/NewTransferModal.tsx src/screens/Stock/MovementModal.tsx
git commit -m "feat(shelves): warn on unregistered shelf in capture/transfer/stock"
```

---

## Task 7: full verification

- [ ] **Step 1: Typecheck, build, and run the whole test suite**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run build`
Expected: "built in …", no errors.
Run: `npx vitest run`
Expected: all tests pass (64 existing + 3 new = 67).

---

## Done — manual verification (after the user runs migration 0014)

1. **Capture** a real shelf (e.g. scan/type `Z2-G005`) → no warning. Type a fake one (`Z2-S999`) → "⚠ Not a registered shelf" under the shelf, but you can still save.
2. Same warning appears in **Transfer** (source/dest) and **Stock IN/OUT** for unregistered shelves; registered ones are clean.
3. **Barcodes → Shelf labels**: the zone dropdown lists each zone with its shelf count (Z01 = 116, Z02 = 48, …). Pick one → a PDF downloads with one label per shelf, matching your existing labels (header, big code, ZONE n, Shelf k of total, Code 128).
