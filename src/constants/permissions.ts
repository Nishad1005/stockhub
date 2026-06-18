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
  | "view_alerts";

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
];

/** Roles whose permissions are editable (admin is locked to full access; pending has none). */
export const EDITABLE_ROLES = ["storekeeper", "manager"] as const;
