/** Pure helpers + validation for the Security gate-entry form (GRN Stage 1). */

export interface GateFormValues {
  vehicleNumber: string;
  driverName: string;
  driverLicense: string;
  driverPhone: string;
  supplierName: string;
  poRef: string;
  invoiceRef: string;
  invoiceDate: string;
  notes: string;
}

export type GateErrorField =
  | "vehicleNumber"
  | "driverName"
  | "supplierName"
  | "driverPhone"
  | "driverLicense";

export type GateErrors = Partial<Record<GateErrorField, string>>;

/** Vehicle numbers are stored uppercased with all whitespace stripped. */
export function normalizeVehicleNumber(raw: string): string {
  return raw.toUpperCase().replace(/\s+/g, "");
}

/** Phone is optional; when present it must be exactly 10 digits. */
export function isValidPhone(phone: string): boolean {
  return /^\d{10}$/.test(phone.trim());
}

/** License is optional; when present it must be 6–20 alphanumeric chars. */
export function isValidLicense(license: string): boolean {
  return /^[A-Za-z0-9]{6,20}$/.test(license.trim());
}

/**
 * Case-insensitive supplier suggestions: prefix matches rank above substring
 * matches. Empty query → no suggestions. Capped at `limit`.
 */
export function filterSuppliers(suppliers: string[], query: string, limit = 8): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const starts: string[] = [];
  const contains: string[] = [];
  for (const s of suppliers) {
    const l = s.toLowerCase();
    if (l.startsWith(q)) starts.push(s);
    else if (l.includes(q)) contains.push(s);
  }
  return [...starts, ...contains].slice(0, limit);
}

/**
 * Validate the gate form. Required: vehicle number, driver name, supplier name.
 * Format-checked only when present: phone (10 digits), license (6–20 alphanumeric).
 */
export function validateGateEntry(v: GateFormValues): GateErrors {
  const e: GateErrors = {};
  if (!normalizeVehicleNumber(v.vehicleNumber)) e.vehicleNumber = "Vehicle number is required.";
  if (!v.driverName.trim()) e.driverName = "Driver name is required.";
  if (!v.supplierName.trim()) e.supplierName = "Supplier name is required.";
  if (v.driverPhone.trim() && !isValidPhone(v.driverPhone)) e.driverPhone = "Phone must be 10 digits.";
  if (v.driverLicense.trim() && !isValidLicense(v.driverLicense)) {
    e.driverLicense = "License must be 6–20 letters or numbers.";
  }
  return e;
}
