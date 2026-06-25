# Barcodes Screen Reorganization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the Barcodes screen into two tabs (Item barcodes | Shelf labels) with zone filter chips for items, so shelf reprint isn't buried and items are filterable by zone — with no behavior change.

**Architecture:** Extract the item-barcode concern into a new `ItemBarcodes` component; slim `BarcodesScreen` to a `ScreenHeader` + a `Chip`-based tab toggle that renders either `<ItemBarcodes />` or the shelf tab (`<ShelfCoverage /> <ShelfLabels />`). A small pure `zonesPresent` helper (unit-tested) drives the zone chips.

**Tech Stack:** React 18 + TS, Tailwind (brand tokens + `src/components/ui/` primitives), Vitest.

## Global Constraints

- **No behavior change** to assign-code, select + download PDF, barcode rendering, or shelf reprint. Pure reorganization + a client-side zone filter.
- Brand tokens only (no raw hex); reuse the `ui/` primitives (`Chip`, `Card`, `Button`, `ScreenHeader`, icons). One component per file.
- Mirror the existing tab pattern from `src/screens/Stock/StockScreen.tsx` (`flex gap-1 bg-brand-accent-soft/50 rounded-xl p-1` with two `flex-1` chips) for consistency.
- Verification gate after each task: `npx tsc --noEmit` clean, `npm run build` green, `npx vitest run` all pass (currently 83).
- Branch: `feat/barcodes-reorg` (already created). Do not touch `main`.

---

### Task 1: `zonesPresent` pure helper (TDD)

**Files:**
- Create: `src/lib/barcodeZones.ts`
- Test: `src/lib/barcodeZones.test.ts`

**Interfaces:**
- Produces: `zonesPresent(entries: ReadonlyArray<{ zone_code: string }>): { zone: string; count: number }[]` — one entry per distinct `zone_code`, sorted by zone ascending, with counts. Consumed by `ItemBarcodes` (Task 2).

- [ ] **Step 1: Write the failing test**

Create `src/lib/barcodeZones.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { zonesPresent } from "./barcodeZones";

describe("zonesPresent", () => {
  it("groups by zone_code, counts, and sorts ascending", () => {
    const rows = [
      { zone_code: "Z03" }, { zone_code: "Z01" }, { zone_code: "Z03" },
      { zone_code: "Z01" }, { zone_code: "Z03" },
    ];
    expect(zonesPresent(rows)).toEqual([
      { zone: "Z01", count: 2 },
      { zone: "Z03", count: 3 },
    ]);
  });

  it("empty input -> empty array", () => {
    expect(zonesPresent([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run src/lib/barcodeZones.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

Create `src/lib/barcodeZones.ts`:

```ts
/** Distinct zones present in a set of entries, with counts, sorted by zone code. */
export function zonesPresent(
  entries: ReadonlyArray<{ zone_code: string }>,
): { zone: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const e of entries) counts.set(e.zone_code, (counts.get(e.zone_code) ?? 0) + 1);
  return [...counts.entries()]
    .map(([zone, count]) => ({ zone, count }))
    .sort((a, b) => a.zone.localeCompare(b.zone));
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npx vitest run src/lib/barcodeZones.test.ts` → PASS (2 tests).
Run: `npx tsc --noEmit` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/barcodeZones.ts src/lib/barcodeZones.test.ts
git commit -m "feat(barcodes): zonesPresent helper (distinct zones + counts)"
```

---

### Task 2: `ItemBarcodes` component (extract item concern + zone chips)

**Files:**
- Create: `src/screens/Barcodes/ItemBarcodes.tsx`

**Interfaces:**
- Consumes: `zonesPresent` (Task 1); `useEntries`, `useAssignItemCode`/`entryCode`/`entryNeedsCode`, `Barcode`, `downloadLabelsPdf`/`LabelData`, `Chip`, `Card`, `Button`, icons.
- Produces: `ItemBarcodes()` — the item-barcode tab body (bulk actions + zone chips + filtered list). Consumed by `BarcodesScreen` (Task 3).

This moves the item logic out of `BarcodesScreen` verbatim and adds a `zone` filter.

- [ ] **Step 1: Create the component**

Create `src/screens/Barcodes/ItemBarcodes.tsx`:

```tsx
import { useMemo, useState } from "react";
import { ZONE_INDEX } from "@/constants/zones";
import { useEntries } from "@/hooks/useEntries";
import { useAssignItemCode, entryCode, entryNeedsCode } from "@/hooks/useAssignItemCode";
import { Barcode } from "@/components/Barcode";
import { downloadLabelsPdf, type LabelData } from "@/lib/labels";
import { zonesPresent } from "@/lib/barcodeZones";
import { toast } from "@/stores/toast";
import { errMessage } from "@/lib/errors";
import type { EntryRow } from "@/types/entry";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Download, Tag } from "@/components/ui/icons";

function metaFor(e: EntryRow): string {
  return [e.defn, e.category, ZONE_INDEX[e.zone_code]?.code ?? e.zone_code].filter(Boolean).join(" · ");
}

/** Item-barcode tab: bulk assign/download, zone filter chips, and the item list. */
export function ItemBarcodes() {
  const { data: entries = [], isLoading } = useEntries();
  const assign = useAssignItemCode();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [zone, setZone] = useState("all");

  const needing = useMemo(() => entries.filter(entryNeedsCode), [entries]);
  const zones = useMemo(() => zonesPresent(entries), [entries]);
  const rows = useMemo(() => {
    const reversed = [...entries].reverse();
    return zone === "all" ? reversed : reversed.filter((e) => e.zone_code === zone);
  }, [entries, zone]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function assignAll() {
    if (!needing.length) return;
    setBusy(true);
    let n = 0;
    try {
      for (const e of needing) {
        await assign.mutateAsync(e.id);
        n++;
      }
      toast(`Assigned ${n} code${n === 1 ? "" : "s"}`, "ok");
    } catch (e) {
      toast(`Assigned ${n}, then failed: ` + errMessage(e), "err");
    } finally {
      setBusy(false);
    }
  }

  async function assignOne(id: string) {
    try {
      const code = await assign.mutateAsync(id);
      toast(`Assigned ${code}`, "ok");
    } catch (e) {
      toast("Assign failed: " + errMessage(e), "err");
    }
  }

  async function download() {
    const labels: LabelData[] = [...entries]
      .filter((e) => selected.has(e.id))
      .map((e) => ({ code: entryCode(e) ?? "", name: e.name, meta: metaFor(e), qty: e.qty }))
      .filter((l) => l.code);
    if (!labels.length) {
      toast("Select coded items first", "warn");
      return;
    }
    try {
      await downloadLabelsPdf(labels);
      toast(`Downloaded ${labels.length} label${labels.length === 1 ? "" : "s"}`, "ok");
    } catch (e) {
      toast("PDF failed: " + errMessage(e), "err");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <Button variant="primary" size="sm" onClick={assignAll} disabled={busy || needing.length === 0} loading={busy}>
          {busy ? "Assigning…" : `Assign codes to ${needing.length} NEW`}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<Download className="w-4 h-4" />}
          onClick={download}
          disabled={selected.size === 0}
        >
          Download {selected.size} label{selected.size === 1 ? "" : "s"} (PDF)
        </Button>
      </div>

      {zones.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Chip active={zone === "all"} onClick={() => setZone("all")}>All</Chip>
          {zones.map((z) => (
            <Chip key={z.zone} active={zone === z.zone} onClick={() => setZone(z.zone)}>
              {ZONE_INDEX[z.zone]?.code ?? z.zone} · {z.count}
            </Chip>
          ))}
        </div>
      )}

      {isLoading && <p className="text-sm text-brand-mute text-center mt-8">Loading…</p>}
      {!isLoading && rows.length === 0 && (
        <p className="text-sm text-brand-mute text-center mt-12 flex flex-col items-center gap-2">
          <Tag className="w-8 h-8 text-brand-mute" />
          {entries.length === 0 ? "No items captured yet." : "No items in this zone."}
        </p>
      )}

      <ul className="space-y-2">
        {rows.map((e) => {
          const code = entryCode(e);
          const isSel = selected.has(e.id);
          return (
            <li key={e.id}>
              <Card className="p-3">
                <div className="flex items-start gap-3">
                  {code ? (
                    <button
                      onClick={() => toggle(e.id)}
                      className={`shrink-0 w-6 h-6 rounded border flex items-center justify-center text-xs ${
                        isSel ? "bg-brand-accent-2 text-white border-brand-accent-2" : "border-brand-line"
                      }`}
                      aria-label="select for printing"
                    >
                      {isSel ? "✓" : ""}
                    </button>
                  ) : (
                    <div className="shrink-0 w-6 h-6" />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-mono font-bold text-brand-accent-2">
                      {code ?? "— no code —"}
                      <span className="ml-1 text-brand-mute font-sans font-normal">
                        {e.master_code ? "· existing" : code ? "· NEW" : ""}
                      </span>
                    </div>
                    <div className="text-sm text-brand-ink truncate">{e.name}</div>
                    <div className="text-xs text-brand-mute truncate">{metaFor(e)}</div>
                    {code ? (
                      <div className="mt-2">
                        <Barcode value={code} />
                      </div>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => assignOne(e.id)}
                        disabled={assign.isPending}
                        className="mt-2"
                      >
                        Assign ITM code
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + build**

Run: `npx tsc --noEmit` → clean. `npm run build` → succeeds.
(`ItemBarcodes` is not yet rendered anywhere; that happens in Task 3.)

- [ ] **Step 3: Commit**

```bash
git add src/screens/Barcodes/ItemBarcodes.tsx
git commit -m "feat(barcodes): ItemBarcodes component with zone filter chips"
```

---

### Task 3: Tab toggle in `BarcodesScreen` + trim shelf-card margins

**Files:**
- Modify (rewrite): `src/screens/Barcodes/BarcodesScreen.tsx`
- Modify: `src/screens/Barcodes/ShelfLabels.tsx:39` (drop `mt-4`)
- Modify: `src/screens/Barcodes/ShelfCoverage.tsx:11` (drop `mt-6`)

**Interfaces:**
- Consumes: `ItemBarcodes` (Task 2), `ShelfCoverage`, `ShelfLabels`, `useEntries`/`entryNeedsCode`, `ScreenHeader`, `Chip`.

The two shelf cards drop their own top margins so the tab container's `space-y-4`
owns all spacing (avoids two `margin-top` rules colliding on one element).

- [ ] **Step 1: Drop the shelf cards' top margins**

In `src/screens/Barcodes/ShelfLabels.tsx`, change the `<Card>` opening tag (line 39):

```tsx
    <Card className="p-4 mt-4">
```

to:

```tsx
    <Card className="p-4">
```

In `src/screens/Barcodes/ShelfCoverage.tsx`, change the `<section>` opening tag (line 11):

```tsx
    <section className="mt-6 bg-white border border-brand-line rounded-xl p-4">
```

to:

```tsx
    <section className="bg-white border border-brand-line rounded-xl p-4">
```

- [ ] **Step 2: Rewrite `BarcodesScreen.tsx`**

Replace the entire contents of `src/screens/Barcodes/BarcodesScreen.tsx`:

```tsx
import { useMemo, useState } from "react";
import { useEntries } from "@/hooks/useEntries";
import { entryNeedsCode } from "@/hooks/useAssignItemCode";
import { ItemBarcodes } from "./ItemBarcodes";
import { ShelfLabels } from "./ShelfLabels";
import { ShelfCoverage } from "./ShelfCoverage";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Chip } from "@/components/ui/Chip";

export function BarcodesScreen() {
  const { data: entries = [] } = useEntries();
  const needing = useMemo(() => entries.filter(entryNeedsCode), [entries]);
  const [tab, setTab] = useState<"items" | "shelf">("items");

  return (
    <div className="min-h-screen bg-brand-cream text-brand-ink">
      <ScreenHeader
        title="Barcodes"
        subtitle={`${entries.length} items · ${needing.length} need a code`}
      />

      <main className="px-4 pb-24 max-w-md mx-auto space-y-4">
        <div className="flex gap-1 bg-brand-accent-soft/50 rounded-xl p-1">
          <Chip active={tab === "items"} onClick={() => setTab("items")} className="flex-1 rounded-lg justify-center">
            Item barcodes
          </Chip>
          <Chip active={tab === "shelf"} onClick={() => setTab("shelf")} className="flex-1 rounded-lg justify-center">
            Shelf labels
          </Chip>
        </div>

        {tab === "items" ? (
          <ItemBarcodes />
        ) : (
          <>
            <ShelfCoverage />
            <ShelfLabels />
          </>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Full gate**

Run: `npx tsc --noEmit` → clean.
Run: `npm run build` → succeeds.
Run: `npx vitest run` → all pass (83 existing + 2 new = 85).

- [ ] **Step 4: Manual parity**

`npm run dev`, open Barcodes:
- Defaults to the **Item barcodes** tab; bulk Assign/Download bar shows; zone chips appear (`All` + per zone with counts); tapping a zone filters the list; selecting items across zones and Download produces the PDF; Assign-one and Assign-all work.
- Tap **Shelf labels**: the coverage card + zone reprint show immediately (no scrolling past items); zone reprint downloads.

- [ ] **Step 5: Commit**

```bash
git add src/screens/Barcodes/BarcodesScreen.tsx src/screens/Barcodes/ShelfLabels.tsx src/screens/Barcodes/ShelfCoverage.tsx
git commit -m "feat(barcodes): two-tab layout (Item barcodes | Shelf labels)"
```

---

## Self-Review

- **Spec coverage:** two-tab toggle (Task 3) ✓; zone filter chips + global bulk actions + persistent selection (Task 2) ✓; shelf tab shows coverage + reprint immediately (Task 3) ✓; behavior preserved — handlers moved verbatim, no mutation/data change (Task 2) ✓; code split into `ItemBarcodes` + slim `BarcodesScreen` + `zonesPresent` helper (Tasks 1–3) ✓; `zonesPresent` unit-tested (Task 1) ✓.
- **Deviation from spec §5 (noted):** the spec said `ShelfCoverage.tsx` is unchanged; this plan also drops its `mt-6` (one class) so the tab's `space-y-4` owns spacing and two `margin-top` rules don't collide on one element. Cosmetic only; no logic change.
- **Placeholder scan:** all code is concrete; no TODO/placeholder.
- **Type consistency:** `zonesPresent(entries): { zone: string; count: number }[]` defined in Task 1 and consumed exactly so in Task 2 (`z.zone`, `z.count`); `ItemBarcodes()` produced in Task 2 and imported in Task 3; tab state typed `"items" | "shelf"`.
