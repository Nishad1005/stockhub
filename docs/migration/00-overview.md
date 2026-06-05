# Migration from v0.1 → v0.2

## How to use these docs

The `legacy/UM_Designs_StockHub.html` file is the **executable spec**. Open it
in a browser to see exactly how each screen should behave. Each per-screen
doc in this folder maps v0.1 behavior to v0.2 React implementation.

Format for each screen doc:

1. **Reference** — line numbers in the HTML
2. **What it does** — user-facing behavior
3. **Data shape** — types involved
4. **Components to create** — React breakdown
5. **State to manage** — Zustand vs React Query vs local
6. **Edge cases** — gotchas from v0.1 (sticky shelf, USB scanner, etc.)
7. **Done when** — acceptance criteria

## Per-screen docs

- `01-capture.md` — Capture screen (most complex)
- `02-items.md` — Items list + edit modal + edit-lock
- `03-transfers.md` — Transfers + STN workflow
- `04-dashboard.md` — Dashboard (5 cards)
- `05-barcodes.md` — Item barcode generation + label printing
- `06-settings.md` — Settings + Access Controls
- `07-scanning.md` — Camera + USB scanner abstraction

## General porting rules

1. **Behavior parity first, code style second.** Don't refactor away features
   that look weird — they probably solve a real warehouse problem.
2. **One screen at a time.** Get one to parity before starting the next.
3. **Test against v0.1 side-by-side.** Open both in adjacent tabs.
4. **Use the same field names** as v0.1's localStorage shape — makes the
   data migration mechanical.
5. **Toast messages should match v0.1 wording** — users may have learned them.
6. **Don't reinvent UX.** If v0.1 uses an emoji, v0.2 uses the same emoji.
