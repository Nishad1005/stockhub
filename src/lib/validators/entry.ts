/**
 * Entry validation — mirrors v0.1 `saveEntry()` / `saveEditModal()` exactly.
 *
 * Parity rules:
 *  - name: required, trimmed (v0.1 `if (!name) toast("Item Name is required")`)
 *  - qty:  optional; blank → null; else parseInt (truncates, like v0.1) and must
 *          be a finite integer >= 0 ("Qty must be 0 or positive")
 *  - text fields (defn/category/notes/...): trimmed; blank → null
 *  - shelf: validated separately via validateShelf() in the hooks (single source
 *           of truth in src/lib/shelf-validator.ts), which also derives the zone
 *           and fixture type.
 */
import { z } from "zod";

/** Trimmed string, with blank coerced to null. Accepts string | null | undefined. */
export const optionalText = z.preprocess((v) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}, z.string().nullable());

/** Required, trimmed, non-empty item name. */
export const requiredName = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() : v),
  z.string().min(1, "Item name is required"),
);

/**
 * Quantity: blank → null; otherwise truncated to an integer (v0.1 used
 * parseInt, so "5.9" → 5) and must be >= 0. Non-numeric input fails validation.
 */
export const entryQty = z.preprocess(
  (v) => {
    if (v === "" || v === null || v === undefined) return null;
    const n = typeof v === "number" ? Math.trunc(v) : parseInt(String(v).trim(), 10);
    return Number.isFinite(n) ? n : Number.NaN; // NaN trips the int check below
  },
  z
    .number({ invalid_type_error: "Qty must be 0 or a positive whole number" })
    .int("Qty must be 0 or a positive whole number")
    .nonnegative("Qty must be 0 or positive")
    .nullable(),
);

/** Create input — what the Capture screen collects. */
export const createEntrySchema = z.object({
  shelfCode: z.string().min(1, "Shelf is required"),
  name: requiredName,
  qty: entryQty.optional().default(null),
  masterCode: optionalText.optional().default(null),
  scannedBarcode: optionalText.optional().default(null),
  defn: optionalText.optional().default(null),
  category: optionalText.optional().default(null),
  notes: optionalText.optional().default(null),
  photoUrl: optionalText.optional().default(null),
});
export type CreateEntryInput = z.input<typeof createEntrySchema>;
export type CreateEntryValues = z.output<typeof createEntrySchema>;

/**
 * Edit patch — the fields v0.1's edit modal can change. Every field optional;
 * an omitted key means "leave unchanged". master_code / scanned_barcode /
 * created_at are intentionally NOT editable (parity with v0.1).
 */
export const updateEntryPatchSchema = z
  .object({
    name: requiredName.optional(),
    zoneCode: z.string().optional(),
    shelfCode: z.string().min(1).optional(),
    qty: entryQty.optional(),
    defn: optionalText.optional(),
    category: optionalText.optional(),
    notes: optionalText.optional(),
  })
  .strict();
export type UpdateEntryPatchInput = z.input<typeof updateEntryPatchSchema>;
export type UpdateEntryPatchValues = z.output<typeof updateEntryPatchSchema>;
