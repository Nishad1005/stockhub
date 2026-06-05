/**
 * Zone definitions.
 *
 * NOTE: zone NAMES are still legacy (RAW-MATERIALS, etc.) — pending user
 * confirmation of the factory's actual zone names (FABRIC, FOAM DEP., WOOD,
 * PACKAGING, ...). When that arrives, update this file and run a database
 * migration to update the `zones` table.
 *
 * Zone CODES (Z01–Z11) are immutable — physical labels and the shelf-code
 * regex depend on them.
 */

export interface Zone {
  code: string;        // e.g. "Z01"
  name: string;        // human-readable
  label: string;       // "Z01 — RAW-MATERIALS" (display)
  purpose: string;     // what the zone is for (shown in UI)
  defaultCat: string;  // pre-fills the category field on Capture ("" = no default)
}

// Values are 1:1 with v0.1 (legacy/UM_Designs_StockHub.html, const ZONES).
// Do NOT alter defaultCat/purpose without user sign-off — they drive the
// Capture category auto-fill and must match v0.1 behavior.
export const ZONES: Zone[] = [
  { code: "Z01", name: "RAW-MATERIALS",   label: "Z01 — RAW-MATERIALS",   purpose: "Fast/medium moving raw material",       defaultCat: "Raw Material" },
  { code: "Z02", name: "RAW-BULK/SLOW",   label: "Z02 — RAW-BULK/SLOW",   purpose: "Slow/bulk raw material",                defaultCat: "Raw Material" },
  { code: "Z03", name: "HARDWARE-SPARES", label: "Z03 — HARDWARE-SPARES", purpose: "Small parts and spares",                defaultCat: "Hardware" },
  { code: "Z04", name: "PACKAGING",       label: "Z04 — PACKAGING",       purpose: "Packing material",                      defaultCat: "Packaging" },
  { code: "Z05", name: "CONSUMABLES",     label: "Z05 — CONSUMABLES",     purpose: "Daily factory consumables",             defaultCat: "Consumable" },
  { code: "Z06", name: "TOOLS-ASSETS",    label: "Z06 — TOOLS-ASSETS",    purpose: "Tools and assets",                      defaultCat: "Asset" },
  { code: "Z07", name: "FG-SFG",          label: "Z07 — FG-SFG",          purpose: "Finished and semi-finished goods",      defaultCat: "Finished Goods" },
  { code: "Z08", name: "QA-SAMPLE-HOLD",  label: "Z08 — QA-SAMPLE-HOLD",  purpose: "Sample, swatch, hold material",         defaultCat: "Sample" },
  { code: "Z09", name: "RECEIVING",       label: "Z09 — RECEIVING",       purpose: "Temporary receiving zone",              defaultCat: "" },
  { code: "Z10", name: "DISPATCH",        label: "Z10 — DISPATCH",        purpose: "Temporary dispatch staging",            defaultCat: "" },
  { code: "Z11", name: "SERVICE-REPAIR",  label: "Z11 — SERVICE-REPAIR",  purpose: "Items out for service / repair / RTV",  defaultCat: "Asset" },
];

export const ZONE_INDEX: Record<string, Zone> = Object.fromEntries(
  ZONES.map((z) => [z.code, z]),
);
