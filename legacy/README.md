# Legacy v0.1 artifacts — READ-ONLY

This folder is the **executable spec** for v0.2. Do NOT edit these files.

## Contents

- `UM_Designs_StockHub.html` — the v0.1 single-file app (405 KB, ~2,778 lines).
  Open in any browser to run. This is the source of truth for all v0.2
  behavior parity.

- `labels/UM_Z*.pdf` — the 5 zone label PDFs (496 location labels total),
  formatted for 100×50mm thermal label stock. Already printed and stuck on
  shelves at Store Tanawada. The shelf-code regex and fixture-type letters
  in v0.2 must match these labels exactly.

## How to use during v0.2 development

1. Open `UM_Designs_StockHub.html` in a browser tab
2. Open v0.2 (`npm run dev`) in an adjacent tab
3. Walk through the same flow in both
4. Make v0.2 match v0.1 — every toast, every disabled state, every keystroke

If something in v0.1 looks wrong or weird, **ask the user before changing it.**
That weirdness probably solves a real warehouse problem.
