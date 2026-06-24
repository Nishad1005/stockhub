# Shelf Barcode Integration (Frozen Set) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or subagent-driven-development) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Finish integrating the developer's frozen 612-shelf barcode set: correct stale label counts in code, add an admin "registered shelves" coverage card to the Barcodes screen, verify parity, and document the one activation step (apply migration 0014).

**Architecture:** No DB/schema change, no new deps. One pure helper + one small read-only component (using the existing `useShelves` hook), plus a comment fix. The migration that activates everything is an owner-run step.

**Tech Stack:** React 18 + TS, TanStack Query (`useShelves`), Tailwind brand tokens, Vitest.

## Global Constraints

- No new dependencies; no migration/schema change in this branch.
- Brand tokens only (`text-brand-*`, `bg-brand-*`); no raw hex.
- Verification: `npx tsc --noEmit` clean, `npm run build` green, `npx vitest run` (existing 67 + new pass).

---

### Task 1: Correct stale label counts in `constants/shelf.ts`

**Files:**
- Modify: `src/constants/shelf.ts:7` and `:28`

- [ ] **Step 1: Fix the "703" comment**

Replace line 7:

```
 * The 703 already-printed physical labels assume this format.
```

with:

```
 * The 612 already-printed physical labels (Z01–Z06) assume this format.
```

- [ ] **Step 2: Fix the "207" example**

Replace line 28:

```tsx
/** Single-letter counter word used on physical labels ("Shelf 5 of 207"). */
```

with:

```tsx
/** Single-letter counter word used on physical labels ("Shelf 5 of 116"). */
```

- [ ] **Step 3: Typecheck + commit**

Run: `npx tsc --noEmit` → clean.

```bash
git add src/constants/shelf.ts
git commit -m "docs(shelf): correct stale label counts (703/207 -> 612, Z01-Z06)"
```

---

### Task 2: `shelvesCoverage` pure helper (TDD)

**Files:**
- Create: `src/lib/shelvesCoverage.ts`
- Test: `src/lib/shelvesCoverage.test.ts`

**Interfaces:**
- Produces: `shelvesCoverage(rows: ReadonlyArray<{ zone_code: string }>): ShelvesCoverage` where
  `ShelvesCoverage = { zones: { zoneCode: string; count: number }[]; total: number }`. Zones sorted by
  `zoneCode` ascending; `total = rows.length`. Consumed by `ShelfCoverage` in Task 3.

- [ ] **Step 1: Write the failing test**

Create `src/lib/shelvesCoverage.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { shelvesCoverage } from "./shelvesCoverage";

describe("shelvesCoverage", () => {
  it("groups by zone, sorts ascending, and totals", () => {
    const rows = [
      { zone_code: "Z02" }, { zone_code: "Z01" }, { zone_code: "Z01" },
      { zone_code: "Z02" }, { zone_code: "Z02" },
    ];
    const r = shelvesCoverage(rows);
    expect(r.total).toBe(5);
    expect(r.zones).toEqual([
      { zoneCode: "Z01", count: 2 },
      { zoneCode: "Z02", count: 3 },
    ]);
  });

  it("empty input → no zones, zero total", () => {
    expect(shelvesCoverage([])).toEqual({ zones: [], total: 0 });
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run src/lib/shelvesCoverage.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the helper**

Create `src/lib/shelvesCoverage.ts`:

```ts
export interface ZoneCoverage {
  zoneCode: string;
  count: number;
}

export interface ShelvesCoverage {
  zones: ZoneCoverage[];
  total: number;
}

/** Count registered shelves per zone, sorted by zone code ascending. */
export function shelvesCoverage(
  rows: ReadonlyArray<{ zone_code: string }>,
): ShelvesCoverage {
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.zone_code, (counts.get(r.zone_code) ?? 0) + 1);
  const zones = [...counts.entries()]
    .map(([zoneCode, count]) => ({ zoneCode, count }))
    .sort((a, b) => a.zoneCode.localeCompare(b.zoneCode));
  return { zones, total: rows.length };
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npx vitest run src/lib/shelvesCoverage.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/shelvesCoverage.ts src/lib/shelvesCoverage.test.ts
git commit -m "feat(shelf): shelvesCoverage helper (per-zone registered counts)"
```

---

### Task 3: `ShelfCoverage` card on the Barcodes screen

**Files:**
- Create: `src/screens/Barcodes/ShelfCoverage.tsx`
- Modify: `src/screens/Barcodes/BarcodesScreen.tsx:7,159`

**Interfaces:**
- Consumes: `useShelves()` → `{ data?: ShelfRow[]; isLoading }`; `shelvesCoverage` (Task 2).
- Produces: `ShelfCoverage()` component.

- [ ] **Step 1: Create the component**

Create `src/screens/Barcodes/ShelfCoverage.tsx`:

```tsx
import { useMemo } from "react";
import { useShelves } from "@/hooks/useShelves";
import { shelvesCoverage } from "@/lib/shelvesCoverage";

/** Read-only: shows how many shelves are registered per zone (admin confidence check). */
export function ShelfCoverage() {
  const { data, isLoading } = useShelves();
  const cov = useMemo(() => shelvesCoverage(data ?? []), [data]);

  return (
    <section className="mt-6 bg-white border border-brand-line rounded-xl p-4">
      <h2 className="text-xs font-bold uppercase tracking-wide text-brand-mute mb-2">
        Registered shelves
      </h2>

      {isLoading ? (
        <p className="text-sm text-brand-mute">Checking…</p>
      ) : cov.total === 0 ? (
        <p className="text-sm text-brand-warn">
          ⚠ No shelves registered yet. An admin must apply migration 0014
          (<span className="font-mono">supabase db push</span>) so scanned labels show as known.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {cov.zones.map((z) => (
              <span
                key={z.zoneCode}
                className="text-xs font-mono px-2 py-1 rounded-lg bg-brand-accent-soft/50 text-brand-ink"
              >
                {z.zoneCode} <span className="text-brand-ok font-bold">✓ {z.count}</span>
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-brand-mute">{cov.total} shelves registered (Z01–Z06).</p>
        </>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Import it in BarcodesScreen**

In `src/screens/Barcodes/BarcodesScreen.tsx`, after line 7 (`import { ShelfLabels } from "./ShelfLabels";`), add:

```tsx
import { ShelfCoverage } from "./ShelfCoverage";
```

- [ ] **Step 3: Render it above ShelfLabels**

Replace line 159:

```tsx
        <ShelfLabels />
```

with:

```tsx
        <ShelfCoverage />
        <ShelfLabels />
```

- [ ] **Step 4: Typecheck + build**

Run: `npx tsc --noEmit` → clean.
Run: `npm run build` → succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/screens/Barcodes/ShelfCoverage.tsx src/screens/Barcodes/BarcodesScreen.tsx
git commit -m "feat(shelf): registered-shelves coverage card on Barcodes screen"
```

---

### Task 4: Verify parity + document the activation step

**Files:**
- Modify: `docs/superpowers/specs/2026-06-25-shelf-barcode-integration-design.md` (tick verification) — optional

- [ ] **Step 1: Confirm per-zone counts sum to 612**

Cross-check `supabase/migrations/0014_shelves.sql` ranges:
`Z01 S1–116 = 116 · Z02 S1–37 + G1–11 = 48 · Z03 S1–96 + P1–22 = 118 · Z04 P1–62 = 62 ·
Z05 R1–136 = 136 · Z06 S1–132 = 132` → **612**. ✓ (matches the coverage card output once 0014 is live).

- [ ] **Step 2: Full test + build sweep**

Run: `npx vitest run` → all pass (67 existing + 2 new = 69).
Run: `npm run build` → green.

- [ ] **Step 3: Owner activation note (no code)**

Surface to the user: the integration is dormant until the owner runs `npx supabase db push` to apply
`0014_shelves.sql` (612 rows). Until then the coverage card shows the amber "apply migration" note and
scans show "⚠ Not a registered shelf". This is the single activation step.

---

## Self-Review

- **Spec coverage:** stale counts fixed (Task 1) ✓; coverage helper + tests (Task 2) ✓; coverage card wired (Task 3) ✓; parity verification + activation note (Task 4) ✓; no schema/dep change ✓.
- **Placeholder scan:** none — all code is concrete.
- **Type consistency:** `shelvesCoverage` signature identical in Tasks 2 and 3; `useShelves()` returns `{ data, isLoading }` per `src/hooks/useShelves.ts`; `ShelfRow` has `zone_code` (used by the helper).
