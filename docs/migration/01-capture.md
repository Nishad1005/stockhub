# Migration: Capture Screen

## Reference
- v0.1 HTML markup: ~ lines 597–700
- v0.1 logic: `renderShelfState`, `applyShelfFromInput`, `setActiveShelfFromScan`, `saveEntry`, `handleUsbScannerKey`

## What it does
The Capture screen is the primary data-entry surface: an operator stands at a
shelf, scans its barcode (which auto-sets the zone), then records each item
on that shelf — scan the item's barcode (or type to search the master), fill
in qty/notes/photo if needed, save. The shelf stays sticky so the next item
captured is at the same location.

## User flow
1. Open Capture (default landing screen)
2. Shelf input is read-only with placeholder "Tap Scan →"
3. Operator taps 📷 Scan or uses a USB scanner
4. Scanned code is validated against `SHELF_RE`; on success:
   - `activeShelf`, `activeFixtureType`, `activeZone` all set
   - Toast: "Shelf set: Z3-S042"
   - Form revealed below
5. Operator scans item barcode OR types item name (4+ chars → autocomplete)
6. If matched against master: defn + category auto-fill
7. Optional: qty, notes, photo
8. Tap Save → entry created, form clears, shelf stays, focus jumps to item name
9. Repeat for next item

## Data shape
See `src/types/entry.ts`. Each save creates one row in `entries`.

## Components to create
- `src/screens/Capture/CaptureScreen.tsx` — layout + state orchestration
- `src/screens/Capture/ShelfCard.tsx` — read-only input + scan button + status
- `src/screens/Capture/ItemForm.tsx` — name + defn + cat + qty + notes + photo
- `src/components/CameraScanner.tsx` — modal wrapping html5-qrcode (web) / MLKit (native)
- `src/components/MasterSearch.tsx` — typeahead against `master_items`
- `src/components/PhotoCapture.tsx` — camera capture + compress + preview

## State to manage
**Zustand** (`useCaptureSession`):
- `activeZone: string | null`
- `activeShelf: string | null`
- `activeFixtureType: FixtureType | null`
- `scanMode: 'item' | 'shelf'`
- `scanTargetFieldId: string | null` (for transfer modal scans)
- `manualEntryMode: boolean` (session-only, set via Settings)

**React Query**:
- `useCreateEntry()` mutation

**Local**:
- Form input values

## Edge cases / gotchas
1. **Sticky shelf** — after save, do NOT clear `activeShelf` or `activeZone`.
   Only clear them when operator taps the ✕ on the shelf card.
2. **Auto-zone derive** — scanning a shelf in a different zone updates the
   active zone. Toast: "Zone auto-set: Z03 — HARDWARE-SPARES".
3. **USB scanner** — global keydown listener catches keystrokes <80ms apart
   ending in Enter. If they match `SHELF_RE`, treated as shelf scan. Listener
   ignores keystrokes when a regular (non-readonly) input has focus.
4. **Scan-only enforcement** — shelf input is `readOnly` unless
   `manualEntryMode === true`. Zone display is non-tappable unless manual mode.
5. **Save validation** — must have `activeShelf` AND `activeZone` AND
   item name. Otherwise toast and don't save.
6. **Photo storage** — compress to max 1024×1024, JPEG quality 75, upload to
   Supabase Storage bucket `entry-photos`, save URL in `photo_url`.

## Done when
- Open Capture, can't see form (no shelf scanned)
- Scan a Z3-S042 label with phone camera → form appears, zone shows "Z03 — HARDWARE-SPARES"
- Type "foam" in item name → 5+ master suggestions appear
- Select a suggestion → defn + category fill in
- Add qty 10, save → entry visible in Items, form cleared, shelf still set
- Capture 3 more items on same shelf without re-scanning
- Tap ✕ on shelf card → form hidden, zone/shelf cleared
- USB scanner test: plug in scanner, scan a label, code captured even with no field focused
- Toggle Manual Entry Mode in Settings → shelf input becomes editable
