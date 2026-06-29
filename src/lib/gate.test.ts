import { describe, it, expect } from "vitest";
import {
  normalizeVehicleNumber,
  isValidPhone,
  isValidLicense,
  filterSuppliers,
  validateGateEntry,
  type GateFormValues,
} from "./gate";

const base: GateFormValues = {
  vehicleNumber: "UP78AB1234",
  driverName: "Ramesh Kumar",
  driverLicense: "",
  driverPhone: "",
  supplierName: "Sharma Timber Co.",
  poRef: "",
  invoiceRef: "",
  invoiceDate: "",
  notes: "",
};

describe("normalizeVehicleNumber", () => {
  it("uppercases and strips all whitespace", () => {
    expect(normalizeVehicleNumber("up78 ab 1234")).toBe("UP78AB1234");
    expect(normalizeVehicleNumber("  hr 26 dq 5551 ")).toBe("HR26DQ5551");
  });
});

describe("isValidPhone", () => {
  it("accepts exactly 10 digits", () => {
    expect(isValidPhone("9876543210")).toBe(true);
  });
  it("rejects non-10-digit or non-numeric", () => {
    expect(isValidPhone("98765")).toBe(false);
    expect(isValidPhone("98765432100")).toBe(false);
    expect(isValidPhone("98765abcde")).toBe(false);
  });
});

describe("isValidLicense", () => {
  it("accepts 6–20 alphanumeric chars", () => {
    expect(isValidLicense("DL0420110012345")).toBe(true);
    expect(isValidLicense("ABC123")).toBe(true);
  });
  it("rejects too short or symbol-laden", () => {
    expect(isValidLicense("AB12")).toBe(false);
    expect(isValidLicense("DL-04/2011")).toBe(false);
  });
});

describe("filterSuppliers", () => {
  const list = ["Sharma Timber Co.", "Sharma Steel", "Verma Ply", "Apex Hardware"];
  it("returns prefix matches before substring matches, case-insensitive", () => {
    expect(filterSuppliers(list, "sharma")).toEqual(["Sharma Timber Co.", "Sharma Steel"]);
    expect(filterSuppliers(list, "ply")).toEqual(["Verma Ply"]);
  });
  it("empty query → no suggestions", () => {
    expect(filterSuppliers(list, "")).toEqual([]);
    expect(filterSuppliers(list, "   ")).toEqual([]);
  });
  it("respects the limit", () => {
    const many = Array.from({ length: 20 }, (_, i) => `Supplier ${i}`);
    expect(filterSuppliers(many, "supplier", 3)).toHaveLength(3);
  });
});

describe("validateGateEntry", () => {
  it("passes a valid form with no errors", () => {
    expect(validateGateEntry(base)).toEqual({});
  });
  it("flags missing required fields", () => {
    const errs = validateGateEntry({ ...base, vehicleNumber: "  ", driverName: "", supplierName: "" });
    expect(errs.vehicleNumber).toBeTruthy();
    expect(errs.driverName).toBeTruthy();
    expect(errs.supplierName).toBeTruthy();
  });
  it("ignores empty optional fields", () => {
    expect(validateGateEntry({ ...base, driverPhone: "", driverLicense: "" })).toEqual({});
  });
  it("flags a bad phone / license only when provided", () => {
    const errs = validateGateEntry({ ...base, driverPhone: "123", driverLicense: "$$" });
    expect(errs.driverPhone).toBeTruthy();
    expect(errs.driverLicense).toBeTruthy();
  });
});
