# 0002 — Use lucide-react for icons

Status: accepted · Date: 2026-06-26

## Context
The UI uses emoji (📷 📦 🔄 ⚙️) for tab-bar and action icons. Emoji render
differently per OS/device and read as unpolished. The Warm & Polished redesign
needs a consistent, crisp icon set.

## Decision
Adopt **lucide-react** — MIT-licensed, tree-shakeable (only imported icons ship),
the de-facto React icon set. Icons are imported through `src/components/ui/icons.ts`
so the dependency surface stays in one file and swaps are one-line.

## Consequences
- One new runtime dependency. Bundle impact is per-icon (tree-shaken), not the
  whole set.
- Replaces emoji in TabBar, ScreenHeader actions, and buttons.
- Alternatives rejected: keep emoji (inconsistent), hand-rolled SVGs (maintenance).
