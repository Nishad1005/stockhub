# Navigation Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the 7-tab bottom bar into 5 (Capture · Items · Movements · Find · More) by hosting Transfers+Stock under a Movements toggle and Barcodes+Users under the (retitled) Settings → More screen.

**Architecture:** Pure presentational/routing change. `TransfersScreen` and `StockScreen` become header-less bodies hosted by a new `MovementsScreen` (segmented toggle). `SettingsScreen` is retitled "More" and gains a Tools card linking to Barcodes/Users. `TabBar` drops to 5 entries; `App.tsx` adds `/movements` + `/more` and redirects the old paths. No DB change, no new dependencies.

**Tech Stack:** React 18 + TypeScript, React Router v6, Tailwind (brand tokens), Vite.

## Global Constraints

- No new dependencies; no DB/migration changes.
- Use brand tokens only (`bg-brand-*`, `text-brand-*`) — no raw hex.
- Permission gating inside Transfers/Stock stays exactly as-is (`can(...)`).
- Verification per task: `npx tsc --noEmit` clean + (final) `npm run build` green + manual check. There are no pure-logic units here, so the compile/build is the test cycle.

---

### Task 1: Make Transfers and Stock embeddable bodies

Strip each screen's page wrapper (`<div className="min-h-screen …">`) and `<header>` so the component returns only its `<main>` + modals. The Movements screen will supply the wrapper, header, and toggle.

**Files:**
- Modify: `src/screens/Transfers/TransfersScreen.tsx:17-23` and `:92`
- Modify: `src/screens/Stock/StockScreen.tsx:15-21` and `:42`

**Interfaces:**
- Produces: `TransfersScreen()` and `StockScreen()` — same component names/exports, now returning a `<>…</>` fragment (no outer min-h-screen / header). Consumed by `MovementsScreen` in Task 2.

- [ ] **Step 1: Strip wrapper+header from TransfersScreen**

In `src/screens/Transfers/TransfersScreen.tsx`, replace the opening wrapper + header (lines 17-23):

```tsx
  return (
    <div className="min-h-screen bg-brand-cream text-brand-ink">
      <header className="px-4 pt-5 pb-2">
        <div className="text-xs font-bold uppercase tracking-widest text-brand-mute">U&amp;M StockHub</div>
        <h1 className="text-xl font-bold">Transfers</h1>
        <p className="text-sm text-brand-mute">Move stock between shelves with an STN audit trail</p>
      </header>

      <main className="px-4 pb-24 max-w-md mx-auto space-y-4">
```

with:

```tsx
  return (
    <>
      <main className="px-4 pb-24 max-w-md mx-auto space-y-4">
```

- [ ] **Step 2: Close the fragment in TransfersScreen**

At the end of the file (lines 90-92), replace:

```tsx
      {showNew && <NewTransferModal onClose={() => setShowNew(false)} />}
      {detail && <TransferDetailModal transfer={detail} onClose={() => setDetail(null)} />}
    </div>
  );
```

with:

```tsx
      {showNew && <NewTransferModal onClose={() => setShowNew(false)} />}
      {detail && <TransferDetailModal transfer={detail} onClose={() => setDetail(null)} />}
    </>
  );
```

- [ ] **Step 3: Strip wrapper+header from StockScreen**

In `src/screens/Stock/StockScreen.tsx`, replace the opening wrapper + header (lines 15-21):

```tsx
  return (
    <div className="min-h-screen bg-brand-cream text-brand-ink">
      <header className="px-4 pt-5 pb-2">
        <div className="text-xs font-bold uppercase tracking-widest text-brand-mute">U&amp;M StockHub</div>
        <h1 className="text-xl font-bold">Stock</h1>
        <p className="text-sm text-brand-mute">Receive, issue, and track inventory</p>
      </header>

      <main className="px-4 pb-24 max-w-md mx-auto space-y-4">
```

with:

```tsx
  return (
    <>
      <main className="px-4 pb-24 max-w-md mx-auto space-y-4">
```

- [ ] **Step 4: Close the fragment in StockScreen**

At the end of the file (lines 41-42), replace:

```tsx
      {movement && <MovementModal type={movement} onClose={() => setMovement(null)} />}
    </div>
  );
```

with:

```tsx
      {movement && <MovementModal type={movement} onClose={() => setMovement(null)} />}
    </>
  );
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (Both screens are still imported by `App.tsx`, so they compile even before Task 5 rewires them.)

- [ ] **Step 6: Commit**

```bash
git add src/screens/Transfers/TransfersScreen.tsx src/screens/Stock/StockScreen.tsx
git commit -m "refactor(nav): make Transfers and Stock screens header-less bodies"
```

---

### Task 2: MovementsScreen with Transfers|Stock toggle

**Files:**
- Create: `src/screens/Movements/MovementsScreen.tsx`

**Interfaces:**
- Consumes: `TransfersScreen`, `StockScreen` from Task 1.
- Produces: `MovementsScreen()` — default-exported via named export `MovementsScreen`. Consumed by `App.tsx` in Task 5.

- [ ] **Step 1: Create MovementsScreen**

Create `src/screens/Movements/MovementsScreen.tsx`:

```tsx
import { useState } from "react";
import { TransfersScreen } from "@/screens/Transfers/TransfersScreen";
import { StockScreen } from "@/screens/Stock/StockScreen";

type View = "transfers" | "stock";

export function MovementsScreen() {
  const [view, setView] = useState<View>("transfers");

  const seg = (active: boolean) =>
    `flex-1 rounded-lg py-1.5 text-sm font-semibold ${active ? "bg-brand-accent-2 text-white" : "text-brand-ink"}`;

  return (
    <div className="min-h-screen bg-brand-cream text-brand-ink">
      <header className="px-4 pt-5 pb-2">
        <div className="text-xs font-bold uppercase tracking-widest text-brand-mute">U&amp;M StockHub</div>
        <h1 className="text-xl font-bold">Movements</h1>
      </header>

      <div className="px-4 max-w-md mx-auto">
        <div className="flex gap-1 bg-brand-accent-soft/50 rounded-xl p-1">
          <button onClick={() => setView("transfers")} className={seg(view === "transfers")}>🔄 Transfers</button>
          <button onClick={() => setView("stock")} className={seg(view === "stock")}>📊 Stock</button>
        </div>
      </div>

      {view === "transfers" ? <TransfersScreen /> : <StockScreen />}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/screens/Movements/MovementsScreen.tsx
git commit -m "feat(nav): add Movements hub with Transfers/Stock toggle"
```

---

### Task 3: Retitle Settings → More + Tools card

**Files:**
- Modify: `src/screens/Settings/SettingsScreen.tsx:16-32`

**Interfaces:**
- Produces: `SettingsScreen()` — unchanged name/export, now titled "More" with a Tools card (Barcodes link for all; Manage users link for admins). Consumed by `App.tsx` `/more` route in Task 5.

- [ ] **Step 1: Change the header title to "More"**

In `src/screens/Settings/SettingsScreen.tsx`, replace line 18:

```tsx
        <h1 className="text-xl font-bold">Settings</h1>
```

with:

```tsx
        <h1 className="text-xl font-bold">More</h1>
```

- [ ] **Step 2: Replace the admin-only Team card with a Tools card**

Replace the block at lines 25-31:

```tsx
        {isAdmin && (
          <Card title="Team">
            <Link to="/users" className="block w-full rounded-lg border border-brand-line py-2 text-sm font-semibold text-center text-brand-ink">
              Manage users →
            </Link>
          </Card>
        )}
```

with:

```tsx
        <Card title="Tools">
          <Link to="/barcodes" className="block w-full rounded-lg border border-brand-line py-2 text-sm font-semibold text-center text-brand-ink">
            🏷️ Barcodes &amp; labels →
          </Link>
          {isAdmin && (
            <Link to="/users" className="mt-2 block w-full rounded-lg border border-brand-line py-2 text-sm font-semibold text-center text-brand-ink">
              👤 Manage users →
            </Link>
          )}
        </Card>
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (`isAdmin`, `Card`, `Link` are all already imported/used in this file.)

- [ ] **Step 4: Commit**

```bash
git add src/screens/Settings/SettingsScreen.tsx
git commit -m "feat(nav): retitle Settings as More with Tools card (Barcodes + Users)"
```

---

### Task 4: TabBar to 5 tabs

**Files:**
- Modify: `src/components/TabBar.tsx:3-11`

- [ ] **Step 1: Replace the TABS array**

In `src/components/TabBar.tsx`, replace lines 3-11:

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

with:

```tsx
const TABS = [
  { to: "/capture", label: "Capture", icon: "📷" },
  { to: "/items", label: "Items", icon: "📦" },
  { to: "/movements", label: "Movements", icon: "🔄" },
  { to: "/dashboard", label: "Find", icon: "🔍" },
  { to: "/more", label: "More", icon: "☰" },
];
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (The grid auto-sizes via `repeat(${TABS.length}, 1fr)`.)

- [ ] **Step 3: Commit**

```bash
git add src/components/TabBar.tsx
git commit -m "feat(nav): bottom bar to 5 tabs (Capture/Items/Movements/Find/More)"
```

---

### Task 5: App.tsx routes + redirects

**Files:**
- Modify: `src/App.tsx:14-16` (imports), `:69-73` (routes)

**Interfaces:**
- Consumes: `MovementsScreen` (Task 2), retitled `SettingsScreen` (Task 3).

- [ ] **Step 1: Update imports**

In `src/App.tsx`, after the existing `TransfersScreen` import (line 14), keep `TransfersScreen`/`StockScreen` imports removed (they are no longer routed directly) and add the Movements import. Replace lines 14-16:

```tsx
import { TransfersScreen } from "@/screens/Transfers/TransfersScreen";
import { SettingsScreen } from "@/screens/Settings/SettingsScreen";
import { StockScreen } from "@/screens/Stock/StockScreen";
```

with:

```tsx
import { MovementsScreen } from "@/screens/Movements/MovementsScreen";
import { SettingsScreen } from "@/screens/Settings/SettingsScreen";
```

- [ ] **Step 2: Update the routes**

Replace the route block at lines 69-73:

```tsx
            <Route path="/transfers" element={protect(<TransfersScreen />)} />
            <Route path="/stock" element={protect(<StockScreen />)} />
            <Route path="/dashboard" element={protect(<DashboardScreen />)} />
            <Route path="/barcodes" element={protect(<BarcodesScreen />)} />
            <Route path="/settings" element={protect(<SettingsScreen />)} />
```

with:

```tsx
            <Route path="/movements" element={protect(<MovementsScreen />)} />
            <Route path="/transfers" element={<Navigate to="/movements" replace />} />
            <Route path="/stock" element={<Navigate to="/movements" replace />} />
            <Route path="/dashboard" element={protect(<DashboardScreen />)} />
            <Route path="/barcodes" element={protect(<BarcodesScreen />)} />
            <Route path="/more" element={protect(<SettingsScreen />)} />
            <Route path="/settings" element={<Navigate to="/more" replace />} />
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors, and no "unused import" complaints (`TransfersScreen`/`StockScreen` are now referenced only inside `MovementsScreen`; `Navigate` is already imported on line 3).

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat(nav): route /movements + /more; redirect old transfers/stock/settings paths"
```

---

### Task 6: Manual verification + docs

**Files:**
- Modify: `docs/USER-MANUAL.md:41-53` (tabs table)

- [ ] **Step 1: Manual smoke test (dev server)**

Run: `npm run dev`, then in the browser confirm:
- Bottom bar shows exactly 5 tabs: Capture, Items, Movements, Find, More.
- Movements: toggle swaps Transfers ↔ Stock; ＋New Transfer and Stock IN/OUT appear per your permissions; STN list + Stock levels/History render.
- More: shows Exports/Access Controls (per permission), Data, Master Data, **Tools** card (Barcodes for everyone; Manage users for admin), About, Account → Sign out works.
- Visiting `/transfers`, `/stock` redirects to `/movements`; `/settings` redirects to `/more`; `/barcodes` and `/users` still load (via More → Tools).

- [ ] **Step 2: Update the USER-MANUAL tabs table**

In `docs/USER-MANUAL.md`, replace the tab table rows (lines 45-51) so the 7-row table becomes:

```markdown
| 📷 **Capture** | Record items on a shelf (the main daily job) |
| 📦 **Items** | Browse / search everything captured; edit or delete |
| 🔄 **Movements** | Transfers (move stock, with an STN) and Stock IN/OUT + levels — switch with the top toggle |
| 🔍 **Find** | "Where is this item?" + counts and alerts |
| ☰ **More** | Exports, account, controls, plus Barcodes and (admin) Manage users |
```

And update the Sign-out reference on line 36 from `Settings ⚙️ → Account → Sign out` to `More ☰ → Account → Sign out`, and the §12 heading/references from "Settings (⚙️)" to "More (☰)".

- [ ] **Step 3: Commit**

```bash
git add docs/USER-MANUAL.md
git commit -m "docs: update user manual for 5-tab navigation"
```

---

## Self-Review

- **Spec coverage:** 5-tab set (Task 4) ✓; Movements toggle hosting refactored bodies (Tasks 1-2) ✓; More = retitled Settings + Tools card (Task 3) ✓; routes /movements + /more with redirects for /transfers,/stock,/settings, keep /barcodes,/users (Task 5) ✓; testing via tsc+build+manual (each task + Task 6) ✓; docs updated (Task 6) ✓.
- **Placeholder scan:** none — every step has exact code.
- **Type consistency:** `MovementsScreen` named export used identically in Task 2 and Task 5; `TransfersScreen`/`StockScreen` keep their export names (Task 1) and are consumed by Task 2; `Navigate` already imported in `App.tsx` line 3; `isAdmin`/`Card`/`Link` already present in `SettingsScreen` (Task 3).
