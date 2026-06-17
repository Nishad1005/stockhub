/**
 * Stock movement validation (Stock IN / OUT). One movement = one item.
 *  - type IN or OUT
 *  - item name required; valid shelf; qty integer >= 1
 *  - source_or_dest required (supplier for IN / department for OUT)
 */
import { z } from "zod";
import { requiredName, optionalText } from "./entry";
import { validateShelf } from "@/lib/shelf-validator";

const movementQty = z.preprocess(
  (v) => {
    if (v === "" || v === null || v === undefined) return Number.NaN;
    const n = typeof v === "number" ? Math.trunc(v) : parseInt(String(v).trim(), 10);
    return Number.isFinite(n) ? n : Number.NaN;
  },
  z.number({ invalid_type_error: "Quantity must be a whole number" })
    .int("Quantity must be a whole number")
    .positive("Quantity must be 1 or more"),
);

const requiredSourceOrDest = z.preprocess(
  (v) => (v == null ? "" : String(v).trim()),
  z.string().min(1, "Source/destination is required"),
);

export const createMovementSchema = z
  .object({
    type: z.enum(["IN", "OUT"]),
    itemName: requiredName,
    itemCode: optionalText.optional().default(null),
    itemDefn: optionalText.optional().default(null),
    itemCategory: optionalText.optional().default(null),
    shelfCode: z.string().min(1, "Shelf is required"),
    qty: movementQty,
    sourceOrDest: requiredSourceOrDest,
    reason: optionalText.optional().default(null),
    authorizedBy: optionalText.optional().default(null),
    notes: optionalText.optional().default(null),
  })
  .superRefine((val, ctx) => {
    if (!validateShelf(val.shelfCode).ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["shelfCode"], message: "Invalid shelf code" });
    }
  });

export type CreateMovementInput = z.input<typeof createMovementSchema>;
