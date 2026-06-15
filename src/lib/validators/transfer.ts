/**
 * Transfer validation — mirrors v0.1 saveTransfer() guards:
 *  - item name required
 *  - source & destination shelves valid (SHELF_RE) and not identical
 *  - qty an integer >= 1
 *  - reason / storekeeper / helper optional
 */
import { z } from "zod";
import { requiredName, optionalText } from "./entry";
import { validateShelf, normaliseShelf } from "@/lib/shelf-validator";

/** Quantity to transfer: parsed to an integer >= 1 (v0.1 used parseInt + > 0). */
const transferQty = z.preprocess(
  (v) => {
    if (v === "" || v === null || v === undefined) return Number.NaN;
    const n = typeof v === "number" ? Math.trunc(v) : parseInt(String(v).trim(), 10);
    return Number.isFinite(n) ? n : Number.NaN;
  },
  z
    .number({ invalid_type_error: "Quantity must be a whole number" })
    .int("Quantity must be a whole number")
    .positive("Quantity must be 1 or more"),
);

export const createTransferSchema = z
  .object({
    itemName: requiredName,
    itemCode: optionalText.optional().default(null),
    itemDefn: optionalText.optional().default(null),
    itemCategory: optionalText.optional().default(null),
    sourceShelf: z.string().min(1, "Source shelf is required"),
    destShelf: z.string().min(1, "Destination shelf is required"),
    qty: transferQty,
    reason: optionalText.optional().default(null),
    storekeeper: optionalText.optional().default(null),
    helper: optionalText.optional().default(null),
  })
  .superRefine((val, ctx) => {
    if (!validateShelf(val.sourceShelf).ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["sourceShelf"], message: "Invalid source shelf code" });
    }
    if (!validateShelf(val.destShelf).ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["destShelf"], message: "Invalid destination shelf code" });
    }
    if (normaliseShelf(val.sourceShelf) === normaliseShelf(val.destShelf)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["destShelf"], message: "Source and destination cannot be identical" });
    }
  });

export type CreateTransferInput = z.input<typeof createTransferSchema>;
export type CreateTransferValues = z.output<typeof createTransferSchema>;
