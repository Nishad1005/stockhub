# Navigation Redesign — Design Spec

Status: **approved** · Date: 2026-06-18 · UI/UX (no DB change, no new deps).

---

## 1. Goal

Reduce the bottom bar from **7 cramped tabs to 5 comfortable ones** by grouping related screens:
a **Movements** hub (Transfers + Stock under a toggle) and a **More** screen (Settings content +
buttons to Barcodes/Users). Every existing screen stays reachable; screen internals are unchanged.

## 2. Decisions (locked)

| Decision | Choice |
|----------|--------|
| Tabs | **Capture · Items · Movements · Find · More** (5). |
| Movements layout | One screen + a **`[ Transfers \| Stock ]` toggle** hosting the existing screen bodies. |
| More layout | The existing **Settings** content on one screen + a **Tools** card (Barcodes button; Users for admins). |
| Transfers/Stock as standalone routes | Redirect to `/movements` (Item Detail uses modals, not these routes). |
| Permission gating | Unchanged — action buttons inside Transfers/Stock stay `can(...)`-gated. |

## 3. The tabs (`TabBar.tsx`)

```
📷 Capture (/capture) · 📦 Items (/items) · 🔄 Movements (/movements) · 🔍 Find (/dashboard) · ☰ More (/more)
```
Bar grid already scales to `TABS.length`; 5 tabs ≈ 75px each.

## 4. Movements hub (`/movements`)

- **`MovementsScreen`** (new): the page wrapper + header **"Movements"** + a segmented
  **`[ 🔄 Transfers | 📊 Stock ]`** toggle (local `view` state, default `transfers`). Renders the
  chosen body below.
- **Refactor `TransfersScreen` and `StockScreen` into header-less bodies**: each currently renders
  its own `min-h-screen` wrapper + `<header>`. Remove those; the component returns its `<main>` +
  modals only. `MovementsScreen` provides the single wrapper + header + toggle.
  - Transfers body keeps: stats card, **＋ New Transfer** (gated `can("transfer")`), the STN list, detail modal.
  - Stock body keeps: **📥 IN / 📤 OUT** buttons (gated), the **Levels / History** toggle, the movement modal.
  - Both toggle options are always viewable (read access is open); only the action buttons are gated.

## 5. More screen (`/more`)

The current **`SettingsScreen`**, retitled header **"More"**, with:
- existing cards unchanged: `{can("export_data") && Exports}`, `{can("change_settings") && Access Controls}`,
  Data, Master Data, About, Account (Sign out).
- the admin-only **Team** card is replaced by a **Tools** card containing:
  - **🏷️ Barcodes & labels →** (Link to `/barcodes`, everyone),
  - **👤 Manage users →** (Link to `/users`, `isAdmin` only).
- Barcodes (`/barcodes`) and Users (`/users`) screens are **unchanged**, reached from here.

## 6. Routing (`App.tsx`)

- Add: `<Route path="/movements" element={protect(<MovementsScreen />)} />` and
  `<Route path="/more" element={protect(<SettingsScreen />)} />`.
- Redirect old paths (deep-link safety): `/transfers` and `/stock` → `<Navigate to="/movements" replace />`;
  `/settings` → `<Navigate to="/more" replace />`.
- Keep: `/capture`, `/items`, `/dashboard`, `/barcodes`, `/users`, plus `/login`, `/signup`.

## 7. Files

| File | Change |
|------|--------|
| `src/screens/Movements/MovementsScreen.tsx` | New — header + Transfers/Stock toggle |
| `src/screens/Transfers/TransfersScreen.tsx` | Strip page wrapper + header → body |
| `src/screens/Stock/StockScreen.tsx` | Strip page wrapper + header → body |
| `src/screens/Settings/SettingsScreen.tsx` | Retitle "More"; Team card → Tools card (Barcodes + Users) |
| `src/components/TabBar.tsx` | 5 tabs |
| `src/App.tsx` | Add `/movements`, `/more`; redirect `/transfers`, `/stock`, `/settings` |

## 8. Testing

Structural/UI — `tsc --noEmit`, `npm run build`, and manual:
- 5 tabs render; each opens the right screen.
- Movements toggle swaps Transfers ↔ Stock; New Transfer / Stock IN-OUT still appear (per permission).
- More shows Settings content + Barcodes button (everyone) + Manage users (admin); Sign out works.
- Old links `/transfers` `/stock` `/settings` redirect correctly; `/barcodes` `/users` still reachable from More.

## 9. Out of scope

- Changing any screen's internal content/behavior (Transfers/Stock/Settings/Barcodes/Users logic unchanged).
- Renaming the `Settings` folder/files (the screen is reused as More; only its title + one card change).
- Other UI/UX backlog items (capture speed-ups, polish pass, onboarding) — separate efforts.
