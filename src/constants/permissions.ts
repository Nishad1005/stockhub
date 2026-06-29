export type PermissionKey =
  | "capture"
  | "transfer"
  | "stock_in"
  | "stock_out"
  | "edit_entry"
  | "delete_entry"
  | "export_data"
  | "unlock_entry"
  | "change_settings"
  | "view_alerts"
  | "grn_gate_entry"
  | "grn_view_own_gate_entries"
  | "grn_verify"
  | "grn_putaway"
  | "grn_reject";

export interface PermissionDef {
  key: PermissionKey;
  label: string;
}

export const PERMISSIONS: PermissionDef[] = [
  { key: "capture", label: "Capture items" },
  { key: "transfer", label: "Transfer stock (Move)" },
  { key: "stock_in", label: "Stock IN (receive)" },
  { key: "stock_out", label: "Stock OUT (issue)" },
  { key: "edit_entry", label: "Edit entries" },
  { key: "delete_entry", label: "Delete entries" },
  { key: "export_data", label: "Export CSV" },
  { key: "unlock_entry", label: "Unlock locked entries" },
  { key: "change_settings", label: "Change access / edit-lock settings" },
  { key: "view_alerts", label: "See the manager Alerts panel" },
  { key: "grn_gate_entry", label: "GRN: create gate entry" },
  { key: "grn_view_own_gate_entries", label: "GRN: view own gate entries" },
  { key: "grn_verify", label: "GRN: verify shipment (Stage 2)" },
  { key: "grn_putaway", label: "GRN: putaway (Stage 3)" },
  { key: "grn_reject", label: "GRN: reject shipment" },
];

/** Roles whose permissions are editable (admin is locked to full access; pending has none). */
export const EDITABLE_ROLES = ["security", "storekeeper", "manager"] as const;
