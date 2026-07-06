import type { Json } from "./database";

/** Composed, camelCased shapes for the GRN verification detail screen. */

export interface GrnDetail {
  id: string;
  grnNumber: string;
  status: string;
  supplierName: string;
  poRef: string | null;
  invoiceRef: string | null;
  invoiceDate: string | null;
  createdAt: string;
  createdBy: string;
  securityAt: string | null;
  storekeeperAt: string | null;
  completedAt: string | null;
  rejectionReason: string | null;
}

export interface GrnGateEntryDetail {
  id: string;
  vehicleNumber: string;
  driverName: string;
  driverLicense: string | null;
  driverPhone: string | null;
  gateInAt: string;
  notes: string | null;
  createdBy: string;
}

export interface GrnLineDetail {
  id: string;
  lineNumber: number;
  itemCode: string | null;
  itemName: string;
  poQty: number | null;
  invoiceQty: number | null;
  receivedQty: number | null;
  varianceFlag: boolean;
  isUnexpected: boolean;
  qcStatus: string;
  qcNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GrnActorProfile {
  id: string;
  fullName: string | null;
  email: string;
}

export interface GrnActivityEvent {
  id: string;
  action: string;
  actorName: string | null;
  actorRole: string | null;
  before: Json | null;
  after: Json | null;
  notes: string | null;
  createdAt: string;
}
