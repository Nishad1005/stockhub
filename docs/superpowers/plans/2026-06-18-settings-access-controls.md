# Settings + Access Controls Implementation Plan (Phase 8)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port v0.1's Settings screen to v0.2 — CSV exports, a DB-shared edit-lock policy, a session-only manual-entry toggle, role-gated access controls (no password), read-only data/master info, and a role-gated per-entry unlock.

**Architecture:** A new `/settings` screen of small cards. The edit-lock window becomes one shared `app_settings` row; a hook syncs it into the existing session store so Items/Edit need no change. Exports are pure client-side CSV builders. Access Controls render only for managers/admins (`useAuth().isManager`).

**Tech Stack:** React 18 + TS, TanStack Query v5, Zustand, Supabase JS, Vitest. **No new dependencies.**

Spec: `docs/superpowers/specs/2026-06-18-settings-access-controls-design.md`.

---

## File structure

| File | Responsibility |
|------|----------------|
| `src/lib/csv.ts` (+ `csv.test.ts`) | Pure CSV builders + browser download |
| `supabase/migrations/0009_app_settings.sql` | New shared-settings table *(user runs)* |
| `src/types/database.ts` (modify) | Add `app_settings` types (hand-added; user's regen matches) |
| `src/hooks/useAppSettings.ts` | Read the settings row |
| `src/hooks/useUpdateEditLockHours.ts` | Role-gated mutation |
| `src/hooks/useEditLockPolicy.ts` | Sync DB value → session store |
| `src/components/AppShell.tsx` (modify) | Call `useEditLockPolicy()` |
| `src/screens/Settings/Card.tsx` | Shared card wrapper |
| `src/screens/Settings/ExportsCard.tsx` | CSV export buttons |
| `src/screens/Settings/AccessControlsCard.tsx` | Edit-lock select + manual-entry toggle |
| `src/screens/Settings/DataCard.tsx` | Read-only counts |
| `src/screens/Settings/MasterDataCard.tsx` | Static master info |
| `src/screens/Settings/AboutCard.tsx` | Static about |
| `src/screens/Settings/SettingsScreen.tsx` | Compose cards |
| `src/components/TabBar.tsx` (modify) | Add ⚙️ Settings tab |
| `src/App.tsx` (modify) | Swap `/settings` placeholder |
| `src/screens/Items/EditEntryModal.tsx` (modify) | Role-gate the existing Unlock button |

---

## Task 1: CSV builders (`csv.ts`)

**Files:** Create `src/lib/csv.ts`, Test `src/lib/csv.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/csv.test.ts
import { describe, it, expect } from "vitest";
import { csvSafe, buildEntriesCsv, buildTransfersCsv } from "./csv";
import type { EntryRow } from "@/types/entry";
import type { TransferRow } from "@/types/transfer";

// created_at: null keeps the Date column deterministic ("" — no locale/TZ noise).
const entry = (p: Partial<EntryRow>): EntryRow =>
  ({
    id: "1", created_at: null, updated_at: null, created_by: "u1",
    zone_code: "Z03", shelf_code: "Z3-S042", fixture_type: "S",
    name: "Foam", master_code: null, assigned_code: null,
    defn: null, category: null, qty: null, notes: null,
    photo_url: null, scanned_barcode: null, ...p,
  }) as unknown as EntryRow;

const transfer = (p: Partial<TransferRow>): TransferRow =>
  ({
    id: "t1", created_at: null, created_by: "u1", stn_number: "STN/2026-06/0001",
    item_code: null, item_name: "Foam", item_defn: null, item_category: null,
    source_zone: "Z03", source_shelf: "Z3-S001", dest_zone: "Z04", dest_shelf: "Z4-S002",
    qty: 5, reason: null, storekeeper: null, helper: null, source_deducted: true, notes: null, ...p,
  }) as unknown as TransferRow;

const lookups = { zoneName: () => "FABRIC", section: () => "Foam & Cushioning" };

describe("csvSafe", () => {
  it("passes plain values through", () => {
    expect(csvSafe("plain")).toBe("plain");
    expect(csvSafe(5)).toBe("5");
    expect(csvSafe(null)).toBe("");
  });
  it("quotes values with comma / quote / newline and doubles quotes", () => {
    expect(csvSafe("a,b")).toBe('"a,b"');
    expect(csvSafe('he "hi"')).toBe('"he ""hi"""');
    expect(csvSafe("l1\nl2")).toBe('"l1\nl2"');
  });
});

describe("buildEntriesCsv", () => {
  it("emits the header and one escaped row, EXISTING when master-matched", () => {
    const csv = buildEntriesCsv(
      [entry({ name: "Foam, Platinum", master_code: "ITM-00042", defn: "40 density", category: "Raw Material", qty: 5 })],
      lookups,
    );
    const lines = csv.split("\n");
    expect(lines[0]).toBe(
      "Date,Zone Code,Zone Name,Shelf Code,Fixture Type,Master Code,Assigned Code,Match Status,Item Name,Definition,Category,Notes,Quantity,Scanned Barcode,Home Section",
    );
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe(
      ',Z03,FABRIC,Z3-S042,Shelf,ITM-00042,,EXISTING,"Foam, Platinum",40 density,Raw Material,,5,,Foam & Cushioning',
    );
  });
  it("marks NEW when there is no master code, and header-only on empty input", () => {
    expect(buildEntriesCsv([entry({})], lookups).split("\n")[1]).toContain(",NEW,");
    expect(buildEntriesCsv([], lookups).split("\n")).toHaveLength(1);
  });
});

describe("buildTransfersCsv", () => {
  it("emits header + row with YES/NO source-deducted", () => {
    const csv = buildTransfersCsv([transfer({ qty: 5, source_deducted: true })]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe(
      "Date,STN Number,Item Code,Item Name,Definition,Category,From Zone,From Shelf,To Zone,To Shelf,Quantity,Source Deducted,Reason,Storekeeper,Helper",
    );
    expect(lines[1]).toBe(",STN/2026-06/0001,,Foam,,,Z03,Z3-S001,Z04,Z4-S002,5,YES,,,");
    expect(buildTransfersCsv([transfer({ source_deducted: false })]).split("\n")[1]).toContain(",NO,");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/csv.test.ts`
Expected: FAIL — "Failed to resolve import './csv'".

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/csv.ts
import type { EntryRow } from "@/types/entry";
import type { TransferRow } from "@/types/transfer";

const FIXTURE_LABEL: Record<string, string> = { S: "Shelf", G: "Ghoda Fixture", P: "Pallet", R: "Rack" };

/** Quote a CSV field if it contains a comma, quote, or newline (RFC-4180). */
export function csvSafe(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export interface EntryCsvLookups {
  zoneName: (zoneCode: string) => string;
  section: (entry: EntryRow) => string;
}

const ENTRY_HEADERS = [
  "Date", "Zone Code", "Zone Name", "Shelf Code", "Fixture Type", "Master Code", "Assigned Code",
  "Match Status", "Item Name", "Definition", "Category", "Notes", "Quantity", "Scanned Barcode", "Home Section",
];

export function buildEntriesCsv(entries: ReadonlyArray<EntryRow>, lookups: EntryCsvLookups): string {
  const rows = entries.map((e) => [
    csvSafe(e.created_at ? new Date(e.created_at).toLocaleString() : ""),
    csvSafe(e.zone_code),
    csvSafe(lookups.zoneName(e.zone_code)),
    csvSafe(e.shelf_code),
    csvSafe(FIXTURE_LABEL[e.fixture_type] ?? ""),
    csvSafe(e.master_code ?? ""),
    csvSafe(e.assigned_code ?? ""),
    e.master_code ? "EXISTING" : "NEW",
    csvSafe(e.name),
    csvSafe(e.defn ?? ""),
    csvSafe(e.category ?? ""),
    csvSafe(e.notes ?? ""),
    e.qty != null ? String(e.qty) : "",
    csvSafe(e.scanned_barcode ?? ""),
    csvSafe(lookups.section(e)),
  ]);
  return [ENTRY_HEADERS, ...rows].map((r) => r.join(",")).join("\n");
}

const TRANSFER_HEADERS = [
  "Date", "STN Number", "Item Code", "Item Name", "Definition", "Category", "From Zone", "From Shelf",
  "To Zone", "To Shelf", "Quantity", "Source Deducted", "Reason", "Storekeeper", "Helper",
];

export function buildTransfersCsv(transfers: ReadonlyArray<TransferRow>): string {
  const rows = transfers.map((t) => [
    csvSafe(t.created_at ? new Date(t.created_at).toLocaleString() : ""),
    csvSafe(t.stn_number),
    csvSafe(t.item_code ?? ""),
    csvSafe(t.item_name),
    csvSafe(t.item_defn ?? ""),
    csvSafe(t.item_category ?? ""),
    csvSafe(t.source_zone),
    csvSafe(t.source_shelf),
    csvSafe(t.dest_zone),
    csvSafe(t.dest_shelf),
    t.qty != null ? String(t.qty) : "",
    t.source_deducted ? "YES" : "NO",
    csvSafe(t.reason ?? ""),
    csvSafe(t.storekeeper ?? ""),
    csvSafe(t.helper ?? ""),
  ]);
  return [TRANSFER_HEADERS, ...rows].map((r) => r.join(",")).join("\n");
}

/** Trigger a browser download of a CSV string (UTF-8 BOM so Excel reads Devanagari). */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/csv.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/csv.ts src/lib/csv.test.ts
git commit -m "feat(settings): CSV builders for entries + transfers"
```

---

## Task 2: `app_settings` migration + types

**Files:** Create `supabase/migrations/0009_app_settings.sql`, Modify `src/types/database.ts`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/0009_app_settings.sql
-- Shared application settings (single row). Phase 8.
create table app_settings (
  id              smallint primary key default 1 check (id = 1),
  edit_lock_hours int not null default 24 check (edit_lock_hours in (1,6,12,24,48,168)),
  updated_at      timestamptz not null default now(),
  updated_by      uuid references profiles(id)
);
insert into app_settings (id, edit_lock_hours) values (1, 24) on conflict do nothing;

alter table app_settings enable row level security;
create policy "App settings readable" on app_settings
  for select using (auth.role() = 'authenticated');
create policy "App settings manager-write" on app_settings
  for update using (current_user_role() in ('manager','admin'))
  with check (current_user_role() in ('manager','admin'));
```

- [ ] **Step 2: Hand-add the `app_settings` types so code compiles before the user regenerates**

In `src/types/database.ts`, inside `Database["public"]["Tables"]` (alongside the other tables such as `entries`), add this entry:

```typescript
      app_settings: {
        Row: {
          id: number
          edit_lock_hours: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: number
          edit_lock_hours?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: number
          edit_lock_hours?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0009_app_settings.sql src/types/database.ts
git commit -m "feat(settings): app_settings table + types (Phase 8)"
```

- [ ] **Step 5: USER STEP (out-of-band, run by the project owner)**

The assistant does NOT run these (DB credentials never pass through it). The owner runs:
```
npx supabase db push                                  # applies 0009
npx supabase gen types typescript --local > src/types/database.ts   # regenerates (matches the hand-added block)
```
Code already compiles against the hand-added types, so implementation can continue without waiting.

---

## Task 3: settings hooks

**Files:** Create `src/hooks/useAppSettings.ts`, `src/hooks/useUpdateEditLockHours.ts`, `src/hooks/useEditLockPolicy.ts`

- [ ] **Step 1: Create the read hook**

```typescript
// src/hooks/useAppSettings.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const appSettingsKeys = { all: ["app_settings"] as const };

export interface AppSettings {
  editLockHours: number;
}

async function fetchAppSettings(): Promise<AppSettings> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("edit_lock_hours")
    .eq("id", 1)
    .single();
  if (error) throw error;
  return { editLockHours: data.edit_lock_hours };
}

/** The single shared settings row. */
export function useAppSettings() {
  return useQuery({ queryKey: appSettingsKeys.all, queryFn: fetchAppSettings });
}
```

- [ ] **Step 2: Create the update mutation**

```typescript
// src/hooks/useUpdateEditLockHours.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { appSettingsKeys } from "./useAppSettings";

/** Update the shared edit-lock window. RLS restricts this to manager/admin. */
export function useUpdateEditLockHours() {
  const qc = useQueryClient();
  return useMutation<number, Error, number>({
    mutationFn: async (hours) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      const { error } = await supabase
        .from("app_settings")
        .update({ edit_lock_hours: hours, updated_by: uid, updated_at: new Date().toISOString() })
        .eq("id", 1);
      if (error) throw error;
      return hours;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: appSettingsKeys.all }),
  });
}
```

- [ ] **Step 3: Create the sync hook**

```typescript
// src/hooks/useEditLockPolicy.ts
import { useEffect } from "react";
import { useAppSettings } from "./useAppSettings";
import { useSessionStore } from "@/stores/session";

/**
 * Sync the shared edit-lock policy (DB) into the session store so existing
 * consumers (Items/Edit) keep reading one value. Call once in AppShell.
 */
export function useEditLockPolicy(): void {
  const { data } = useAppSettings();
  const setEditLockHours = useSessionStore((s) => s.setEditLockHours);
  useEffect(() => {
    if (data?.editLockHours != null) setEditLockHours(data.editLockHours);
  }, [data?.editLockHours, setEditLockHours]);
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useAppSettings.ts src/hooks/useUpdateEditLockHours.ts src/hooks/useEditLockPolicy.ts
git commit -m "feat(settings): app-settings hooks + edit-lock policy sync"
```

---

## Task 4: wire the policy sync into AppShell

**Files:** Modify `src/components/AppShell.tsx`

- [ ] **Step 1: Add the sync call**

Replace the whole file with:

```tsx
// src/components/AppShell.tsx
import type { ReactNode } from "react";
import { TabBar } from "./TabBar";
import { useEditLockPolicy } from "@/hooks/useEditLockPolicy";

/** Wraps an authenticated screen with the bottom tab bar. */
export function AppShell({ children }: { children: ReactNode }) {
  useEditLockPolicy(); // seed the session edit-lock window from the shared DB policy
  return (
    <>
      {children}
      <TabBar />
    </>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/AppShell.tsx
git commit -m "feat(settings): seed edit-lock window from shared policy in AppShell"
```

---

## Task 5: Settings cards + screen

**Files:** Create `src/screens/Settings/Card.tsx`, `ExportsCard.tsx`, `AccessControlsCard.tsx`, `DataCard.tsx`, `MasterDataCard.tsx`, `AboutCard.tsx`, `SettingsScreen.tsx`

- [ ] **Step 1: Shared card wrapper**

```tsx
// src/screens/Settings/Card.tsx
import type { ReactNode } from "react";

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="bg-white border border-brand-line rounded-xl p-4">
      <h2 className="text-xs font-bold uppercase tracking-wide text-brand-mute mb-3">{title}</h2>
      {children}
    </section>
  );
}
```

- [ ] **Step 2: Exports card**

```tsx
// src/screens/Settings/ExportsCard.tsx
import { useEntries } from "@/hooks/useEntries";
import { useTransfers } from "@/hooks/useTransfers";
import { useMasterItems } from "@/hooks/useMasterItems";
import { ZONE_INDEX } from "@/constants/zones";
import { buildEntriesCsv, buildTransfersCsv, downloadCsv } from "@/lib/csv";
import { toast } from "@/stores/toast";
import type { EntryRow } from "@/types/entry";
import { Card } from "./Card";

const stamp = () => new Date().toISOString().slice(0, 10);

export function ExportsCard() {
  const { data: entries = [] } = useEntries();
  const { data: transfers = [] } = useTransfers();
  const { data: master = [] } = useMasterItems();

  function exportEntries() {
    if (!entries.length) {
      toast("Nothing to export", "warn");
      return;
    }
    const sectionByCode = new Map(master.map((m) => [m.code, m.section]));
    const csv = buildEntriesCsv(entries, {
      zoneName: (code) => ZONE_INDEX[code]?.name ?? code,
      section: (e: EntryRow) => (e.master_code ? sectionByCode.get(e.master_code) ?? "" : ""),
    });
    downloadCsv(`UM_StockHub_Entries_${stamp()}.csv`, csv);
    toast(`Exported ${entries.length} entries`, "ok");
  }

  function exportTransfers() {
    if (!transfers.length) {
      toast("Nothing to export", "warn");
      return;
    }
    downloadCsv(`UM_StockHub_Transfers_${stamp()}.csv`, buildTransfersCsv(transfers));
    toast(`Exported ${transfers.length} transfers`, "ok");
  }

  const btn = "w-full rounded-lg border border-brand-line py-2 text-sm font-semibold text-brand-ink";

  return (
    <Card title="Exports">
      <div className="space-y-2">
        <button onClick={exportEntries} className={btn}>⬇ Export entries CSV</button>
        <button onClick={exportTransfers} className={btn}>⬇ Export transfers CSV</button>
      </div>
      <p className="text-[11px] text-brand-mute mt-2">
        Opens in Excel. Photos stay in cloud storage (not bundled).
      </p>
    </Card>
  );
}
```

- [ ] **Step 3: Access Controls card**

```tsx
// src/screens/Settings/AccessControlsCard.tsx
import { useAppSettings } from "@/hooks/useAppSettings";
import { useUpdateEditLockHours } from "@/hooks/useUpdateEditLockHours";
import { useSessionStore } from "@/stores/session";
import { EDIT_LOCK_OPTIONS_HOURS } from "@/lib/editLock";
import { toast } from "@/stores/toast";
import { errMessage } from "@/lib/errors";
import { Card } from "./Card";

const LOCK_LABEL: Record<number, string> = {
  1: "1 hour", 6: "6 hours", 12: "12 hours", 24: "24 hours (default)", 48: "48 hours", 168: "7 days",
};

export function AccessControlsCard() {
  const { data: settings } = useAppSettings();
  const update = useUpdateEditLockHours();
  const manualEntryMode = useSessionStore((s) => s.manualEntryMode);
  const setManualEntryMode = useSessionStore((s) => s.setManualEntryMode);
  const editLockHours = settings?.editLockHours ?? 24;

  async function onChangeLock(hours: number) {
    try {
      await update.mutateAsync(hours);
      toast(`Edit-lock set to ${hours}h`, "ok");
    } catch (e) {
      toast("Couldn't update: " + errMessage(e), "err");
    }
  }

  return (
    <Card title="🔐 Access Controls">
      <div className="text-[11px] font-mono text-brand-mute mb-3">
        Manual entry: {manualEntryMode ? "ON ⚠️" : "OFF ✓"} · Edit-lock: {editLockHours}h
      </div>

      <label className="block text-xs font-semibold text-brand-mute mb-1">Edit-Lock Window</label>
      <select
        value={editLockHours}
        disabled={update.isPending}
        onChange={(e) => onChangeLock(parseInt(e.target.value, 10))}
        className="w-full rounded-lg border border-brand-line px-3 py-2 text-sm disabled:opacity-60"
      >
        {EDIT_LOCK_OPTIONS_HOURS.map((h) => (
          <option key={h} value={h}>{LOCK_LABEL[h]}</option>
        ))}
      </select>
      <p className="text-[11px] text-brand-mute mt-1 mb-4">
        Entries lock for editing this many hours after capture.
      </p>

      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-brand-ink">Manual Entry Mode</div>
          <div className="text-[11px] text-brand-mute">Type zone/shelf instead of scanning. Session-only.</div>
        </div>
        <button
          onClick={() => setManualEntryMode(!manualEntryMode)}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
            manualEntryMode ? "bg-brand-bad text-white" : "border border-brand-line text-brand-ink"
          }`}
        >
          {manualEntryMode ? "ON" : "OFF"}
        </button>
      </div>
    </Card>
  );
}
```

- [ ] **Step 4: Data + Master Data + About cards**

```tsx
// src/screens/Settings/DataCard.tsx
import { useEntries } from "@/hooks/useEntries";
import { useTransfers } from "@/hooks/useTransfers";
import { Card } from "./Card";

export function DataCard() {
  const { data: entries = [] } = useEntries();
  const { data: transfers = [] } = useTransfers();
  const withPhotos = entries.filter((e) => e.photo_url).length;
  return (
    <Card title="Data">
      <div className="text-sm leading-7 text-brand-ink">
        <div><b>Entries:</b> {entries.length}</div>
        <div><b>With photos:</b> {withPhotos}</div>
        <div><b>Transfers:</b> {transfers.length}</div>
      </div>
    </Card>
  );
}
```

```tsx
// src/screens/Settings/MasterDataCard.tsx
import { Card } from "./Card";

export function MasterDataCard() {
  return (
    <Card title="Master Data">
      <div className="text-sm leading-7 text-brand-ink">
        <div><b>Items:</b> <span className="font-mono">4,561</span></div>
        <div><b>Zones:</b> <span className="font-mono">11</span> (Z01–Z11)</div>
        <div><b>Categories:</b> <span className="font-mono">6</span></div>
        <div><b>Sections:</b> <span className="font-mono">13</span></div>
      </div>
      <p className="text-[11px] text-brand-mute mt-2">Re-seeded from the factory Stock_Analysis CSV.</p>
    </Card>
  );
}
```

```tsx
// src/screens/Settings/AboutCard.tsx
import { Card } from "./Card";

export function AboutCard() {
  return (
    <Card title="About">
      <div className="text-sm text-brand-ink">U&amp;M Designs · StockHub <b>v0.2</b></div>
      <div className="text-[11px] text-brand-mute mt-1">Warehouse stock management · Store Tanawada</div>
    </Card>
  );
}
```

- [ ] **Step 5: The screen**

```tsx
// src/screens/Settings/SettingsScreen.tsx
import { useAuth } from "@/hooks/useAuth";
import { ExportsCard } from "./ExportsCard";
import { AccessControlsCard } from "./AccessControlsCard";
import { DataCard } from "./DataCard";
import { MasterDataCard } from "./MasterDataCard";
import { AboutCard } from "./AboutCard";

export function SettingsScreen() {
  const { isManager } = useAuth();
  return (
    <div className="min-h-screen bg-brand-cream text-brand-ink">
      <header className="px-4 pt-5 pb-2">
        <div className="text-xs font-bold uppercase tracking-widest text-brand-mute">U&amp;M StockHub</div>
        <h1 className="text-xl font-bold">Settings</h1>
      </header>
      <main className="px-4 pb-24 max-w-md mx-auto space-y-4">
        <ExportsCard />
        {isManager && <AccessControlsCard />}
        <DataCard />
        <MasterDataCard />
        <AboutCard />
      </main>
    </div>
  );
}
```

- [ ] **Step 6: Typecheck + build**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run build`
Expected: "built in …", no errors.

- [ ] **Step 7: Commit**

```bash
git add src/screens/Settings/
git commit -m "feat(settings): Settings screen + cards"
```

---

## Task 6: wire route + tab

**Files:** Modify `src/App.tsx`, `src/components/TabBar.tsx`

- [ ] **Step 1: Import + swap the route in `src/App.tsx`**

Add after the `TransfersScreen` import (line 14):

```tsx
import { SettingsScreen } from "@/screens/Settings/SettingsScreen";
```

Replace this line:

```tsx
            <Route path="/settings" element={protect(<Placeholder name="Settings" />)} />
```

with:

```tsx
            <Route path="/settings" element={protect(<SettingsScreen />)} />
```

- [ ] **Step 2: Add the ⚙️ tab in `src/components/TabBar.tsx`**

Replace the `TABS` array with:

```tsx
const TABS = [
  { to: "/capture", label: "Capture", icon: "📷" },
  { to: "/items", label: "Items", icon: "📦" },
  { to: "/transfers", label: "Transfers", icon: "🔄" },
  { to: "/dashboard", label: "Find", icon: "🔍" },
  { to: "/barcodes", label: "Barcodes", icon: "🏷️" },
  { to: "/settings", label: "Settings", icon: "⚙️" },
];
```

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run build`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/TabBar.tsx
git commit -m "feat(settings): wire /settings route + Settings tab"
```

---

## Task 7: role-gate the per-entry Unlock button

**Files:** Modify `src/screens/Items/EditEntryModal.tsx`

The Unlock button already exists in the locked banner; it must only show for managers/admins. The locked message itself still shows for everyone.

- [ ] **Step 1: Import `useAuth` and read `isManager`**

Add to the imports (after line 8, `import { errMessage } …`):

```tsx
import { useAuth } from "@/hooks/useAuth";
```

Add inside the component, right after `const del = useDeleteEntry();` (line 19):

```tsx
  const { isManager } = useAuth();
```

- [ ] **Step 2: Gate the Unlock button**

Replace the locked banner block (currently lines ~79–92):

```tsx
        {locked && (
          <div className="mb-3 rounded-lg border-l-4 border-brand-bad bg-brand-cream p-3 text-xs text-brand-bad">
            🔒 <b>Locked</b> — captured {ageHrs}h ago, beyond the {editLockHours}h edit window.
            <button
              onClick={() => {
                unlockEntry(entry.id);
                toast("Unlocked for this session", "ok");
              }}
              className="mt-2 w-full rounded-lg border border-brand-bad py-1.5 font-semibold"
            >
              🔓 Unlock
            </button>
          </div>
        )}
```

with (button now wrapped in `isManager`):

```tsx
        {locked && (
          <div className="mb-3 rounded-lg border-l-4 border-brand-bad bg-brand-cream p-3 text-xs text-brand-bad">
            🔒 <b>Locked</b> — captured {ageHrs}h ago, beyond the {editLockHours}h edit window.
            {isManager ? (
              <button
                onClick={() => {
                  unlockEntry(entry.id);
                  toast("Unlocked for this session", "ok");
                }}
                className="mt-2 w-full rounded-lg border border-brand-bad py-1.5 font-semibold"
              >
                🔓 Unlock
              </button>
            ) : (
              <div className="mt-1">A manager can unlock this entry.</div>
            )}
          </div>
        )}
```

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run build`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/screens/Items/EditEntryModal.tsx
git commit -m "feat(settings): role-gate the per-entry unlock button"
```

---

## Task 8: full verification

- [ ] **Step 1: Typecheck, build, and run the whole test suite**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run build`
Expected: "built in …", no errors.
Run: `npx vitest run`
Expected: all tests pass (39 existing + 5 new = 44).

---

## Done — manual verification (after the user runs migration 0009)

1. **Settings tab** ⚙️ appears 6th in the bottom bar; opens the screen.
2. **Exports** → "Export entries CSV" downloads a CSV that opens cleanly in Excel (Hindi intact); "Export transfers CSV" likewise. Empty data → "Nothing to export" toast.
3. **As a manager/admin:** Access Controls card is visible; changing the **Edit-Lock Window** persists (reload → still the new value; a second device sees it after refresh). **Manual Entry Mode** toggles ON/OFF and resets after a reload.
4. **As a storekeeper:** Access Controls card is **hidden**; on a locked entry the Edit modal shows "A manager can unlock this entry." with no Unlock button.
5. **Data** card shows entry / photo / transfer counts; **Master Data** shows 4,561 / 11 / 6 / 13.
6. A locked entry, edit-lock window changed by a manager → the lock state on Items reflects the new window after the page reloads (policy synced via AppShell).
