# UI Polish — Design System & Full Sweep — Design Spec

Status: **approved (visual direction + component kit)** · Date: 2026-06-26
Palette unchanged · One new dependency (lucide-react, ADR required)

---

## 1. Goal

Make the app feel like a finished, premium product. The user flagged all four
symptoms at once — inconsistent, flat/dated, cluttered, not premium. They share a
single root cause: **there is no shared design system.** Every screen hand-rolls
its own buttons, cards, headers, and spacing in inline Tailwind, so nothing lines
up. Fix the foundation once and all four symptoms improve together; then apply it
to every screen.

This is a **pure visual/structural refactor** — no behavior, validation, or data
changes. v0.1 parity is preserved (CLAUDE.md §7). We do not make any screen
stricter than it is today.

## 2. Locked decisions

- **Feel:** "Warm & Polished" — white cards, soft chocolate-tinted shadows, roomy
  spacing, rounded corners (validated against the alternative "Crisp Enterprise"
  in the visual companion; user chose Warm).
- **Palette:** the existing chocolate `brand.*` tokens, **unchanged** (CLAUDE.md
  §5.5 — locked). No recolor.
- **Icons:** **lucide-react**, replacing all emoji (tab bar, headers, buttons).
  New dependency → ADR in `docs/decisions/` before install (CLAUDE.md §8).
- **Component kit approved:** screen header, Button (4 variants), inputs/search,
  status pills, list card, modal/bottom-sheet.

## 3. Architecture — the design-system layer

New presentational primitives under **`src/components/ui/`** (one component per
file, props interface co-located, Tailwind + brand tokens only):

| Primitive | Responsibility | Key props |
|-----------|----------------|-----------|
| `Button.tsx` | All buttons | `variant: primary\|secondary\|ghost\|danger`, `size: sm\|md`, `icon?`, `loading?`, `disabled?` |
| `Field.tsx` | Text input shell | `mono?` (for codes), focus ring, `leadingIcon?` |
| `SearchField.tsx` | Search input | wraps `Field` with search icon + clear |
| `Badge.tsx` | Status pill | `tone: ok\|warn\|bad\|neutral`, `dot?` |
| `Card.tsx` | White list/content surface | `as?`, `onClick?`, soft shadow |
| `ScreenHeader.tsx` | Top-of-screen header | `eyebrow`, `title`, `subtitle?`, `action?` slot |
| `Modal.tsx` | Shared modal / bottom-sheet shell | `title`, `onClose`, `footer?`; grab handle, scrim, body |
| `icons.ts` | Thin re-export map of the lucide icons used (tabs, actions) so swaps are one-line |

**Token additions** in `tailwind.config.ts` (additive, within palette):
- `boxShadow`: `card`, `sheet`, `btn` — soft, chocolate-tinted (e.g.
  `0 2px 10px rgba(44,30,15,.07)`).
- `borderRadius`: add `xl: 14px`, `2xl: 18px` to match the kit (keep existing
  `sm/DEFAULT/lg`).
- A documented **type scale** (title / section / body / meta / mono-code) applied
  consistently via existing Tailwind text utilities — no new tokens needed.

**Shared chrome:**
- `TabBar.tsx` — restyle with lucide icons + an active "pill" treatment (tan
  background behind the active tab), replacing the emoji row.
- `ScreenHeader` adopted by every screen, removing the duplicated inline header
  markup.

## 4. Scope — full sweep, built in reviewable batches

The user chose "full sweep now." To keep the diff reviewable and always-green, we
build the foundation first, then convert screens in batches, running
`tsc` + `build` + `vitest` after **each batch** (not just at the end). All on one
branch: **`feat/ui-polish`**.

1. **Foundation** — ADR + install lucide-react; tokens; `ui/` primitives; TabBar;
   AppShell. (No screen looks different yet except the tab bar.)
2. **Core screens** — Items, Capture, Transfers, Stock, Dashboard (Find),
   Barcodes, Settings.
3. **Modals & detail views** — ItemDetail, EditEntry, NewTransfer,
   TransferDetail, Movement modals, ManagerUnlock, MasterSearch, PhotoCapture.
4. **Auth & edge** — Login, SignUp, PendingApproval, Splash, ErrorBoundary,
   Toaster styling.
5. **Settings sub-cards** — Card, About, AccessControls, Data, Exports,
   MasterData, Users / RolePermissions.

Each screen task = swap hand-rolled markup for primitives; **no logic touched.**

## 5. Out of scope (YAGNI)

- Any palette/brand-color change.
- The navigation redesign (7→5 tabs) — parked on `feat/nav-redesign`, separate
  effort. This sweep restyles the **current** 7-tab bar in place.
- New features, new validation, dark mode, animations beyond simple transitions.

## 6. Testing & verification

- After every batch: `npx tsc --noEmit` clean, `npm run build` green,
  `npx vitest run` all pass.
- Add small pure unit tests for `Button` and `Badge` variant→class mapping.
- Manual parity check per screen: same actions, same outcomes as before the swap.

## 7. Risks & mitigations

- **Large surface (28 screens).** → Batch + verify; one branch; reviewable chunks.
- **Modal refactor could alter behavior.** → Keep all logic; only replace the
  presentational shell (scrim, container, header, footer).
- **Icon dep creep.** → Import only the icons used; lucide is tree-shaken.

## 8. Files

| Area | Change |
|------|--------|
| `docs/decisions/0002-lucide-react.md` | New — ADR for the icon dependency |
| `tailwind.config.ts` | Add shadow + radius tokens |
| `src/components/ui/*` | New — Button, Field, SearchField, Badge, Card, ScreenHeader, Modal, icons |
| `src/components/TabBar.tsx` | Restyle with lucide + active pill |
| `src/screens/**/*` | Convert to primitives (no logic change) |
| `src/components/ui/*.test.ts(x)` | New — Button/Badge variant tests |
