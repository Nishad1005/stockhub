import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label, inputClasses } from "@/components/ui/Field";
import { Camera, X } from "@/components/ui/icons";
import { useCreateGateEntry } from "@/hooks/useCreateGateEntry";
import { useGrnSuppliers } from "@/hooks/useGrnSuppliers";
import { useAttachments } from "@/hooks/useAttachments";
import { logActivity } from "@/lib/activity";
import { toast } from "@/stores/toast";
import { errMessage } from "@/lib/errors";
import {
  normalizeVehicleNumber,
  filterSuppliers,
  validateGateEntry,
  type GateErrors,
} from "@/lib/gate";
import type { GateConfirmationData } from "./GateConfirmation";

type Phase = "idle" | "creating" | "uploading";

interface PendingUpload {
  gateEntryId: string;
  files: File[];
  confirmation: GateConfirmationData;
}

export function GateEntryForm({
  onSuccess,
  onViewList,
}: {
  onSuccess: (data: GateConfirmationData) => void;
  onViewList: () => void;
}) {
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverLicense, setDriverLicense] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [poRef, setPoRef] = useState("");
  const [invoiceRef, setInvoiceRef] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [notes, setNotes] = useState("");
  const [documentPhoto, setDocumentPhoto] = useState<File | null>(null);
  const [vehiclePhoto, setVehiclePhoto] = useState<File | null>(null);

  const [errors, setErrors] = useState<GateErrors>({});
  const [phase, setPhase] = useState<Phase>("idle");
  const [pending, setPending] = useState<PendingUpload | null>(null);
  const [showSuppliers, setShowSuppliers] = useState(false);

  const create = useCreateGateEntry();
  const { data: suppliers = [] } = useGrnSuppliers();
  // Bound to the new gate-entry id once it exists (null before submit → upload disabled).
  const { addAttachment } = useAttachments("grn_gate_entry", pending?.gateEntryId ?? null);

  const supplierMatches = filterSuppliers(suppliers, supplierName);

  // Once the gate-entry row exists, the hook above is bound to its id, so upload the
  // photos here, then advance to the confirmation screen. Photo failures are non-fatal:
  // the row is valid without them (the user can re-add later — Sprint-1 follow-up).
  useEffect(() => {
    if (!pending) return;
    let active = true;
    void (async () => {
      let photoFailed = false;
      for (const file of pending.files) {
        try {
          await new Promise<void>((resolve, reject) =>
            addAttachment(file, { onSuccess: () => resolve(), onError: (e) => reject(e) }),
          );
        } catch {
          photoFailed = true;
        }
      }
      if (!active) return;
      if (photoFailed) {
        toast("Gate entry saved, but a photo didn't upload. You can add it again later.", "warn");
      }
      onSuccess(pending.confirmation);
      setPending(null);
      setPhase("idle");
    })();
    return () => {
      active = false;
    };
    // addAttachment is referentially stable for this pending id; re-run only on `pending`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const values = {
      vehicleNumber, driverName, driverLicense, driverPhone,
      supplierName, poRef, invoiceRef, invoiceDate, notes,
    };
    const errs = validateGateEntry(values);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const vehicle = normalizeVehicleNumber(vehicleNumber);
    const supplier = supplierName.trim();

    setPhase("creating");
    create.mutate(
      {
        vehicleNumber: vehicle,
        driverName: driverName.trim(),
        driverLicense: driverLicense.trim() || null,
        driverPhone: driverPhone.trim() || null,
        supplierName: supplier,
        poRef: poRef.trim() || null,
        invoiceRef: invoiceRef.trim() || null,
        invoiceDate: invoiceDate || null,
        notes: notes.trim() || null,
      },
      {
        onSuccess: ({ grnId, gateEntryId, grnNumber }) => {
          logActivity({
            action: "grn.gate_entry.created",
            entityType: "grn",
            entityId: grnId,
            after: {
              status: "DRAFT",
              grn_number: grnNumber,
              vehicle_number: vehicle,
              supplier_name: supplier,
            },
          });
          const confirmation: GateConfirmationData = {
            grnId,
            grnNumber,
            vehicleNumber: vehicle,
            driverName: driverName.trim(),
            supplierName: supplier,
          };
          const files = [documentPhoto, vehiclePhoto].filter((f): f is File => f != null);
          if (files.length > 0) {
            setPhase("uploading");
            setPending({ gateEntryId, files, confirmation });
          } else {
            onSuccess(confirmation);
            setPhase("idle");
          }
        },
        onError: (err) => {
          toast("Couldn't save gate entry: " + errMessage(err), "err");
          setPhase("idle");
        },
      },
    );
  }

  const submitting = phase !== "idle";
  const submitLabel =
    phase === "creating" ? "Submitting…" : phase === "uploading" ? "Uploading photos…" : "Submit gate entry";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="vehicle" required>Vehicle number</Label>
        <Input
          id="vehicle"
          mono
          autoComplete="off"
          placeholder="UP78AB1234"
          value={vehicleNumber}
          onChange={(e) => setVehicleNumber(normalizeVehicleNumber(e.target.value))}
          invalid={!!errors.vehicleNumber}
        />
        {errors.vehicleNumber && <FieldError msg={errors.vehicleNumber} />}
      </div>

      <div>
        <Label htmlFor="driver" required>Driver name</Label>
        <Input
          id="driver"
          value={driverName}
          onChange={(e) => setDriverName(e.target.value)}
          invalid={!!errors.driverName}
        />
        {errors.driverName && <FieldError msg={errors.driverName} />}
      </div>

      <div>
        <Label htmlFor="license">Driver license number</Label>
        <Input
          id="license"
          autoComplete="off"
          value={driverLicense}
          onChange={(e) => setDriverLicense(e.target.value)}
          invalid={!!errors.driverLicense}
        />
        {errors.driverLicense && <FieldError msg={errors.driverLicense} />}
      </div>

      <div>
        <Label htmlFor="phone">Driver phone</Label>
        <Input
          id="phone"
          inputMode="numeric"
          placeholder="10-digit mobile"
          value={driverPhone}
          onChange={(e) => setDriverPhone(e.target.value)}
          invalid={!!errors.driverPhone}
        />
        {errors.driverPhone && <FieldError msg={errors.driverPhone} />}
      </div>

      <div className="relative">
        <Label htmlFor="supplier" required>Supplier name</Label>
        <Input
          id="supplier"
          autoComplete="off"
          value={supplierName}
          onChange={(e) => {
            setSupplierName(e.target.value);
            setShowSuppliers(true);
          }}
          onFocus={() => setShowSuppliers(true)}
          onBlur={() => window.setTimeout(() => setShowSuppliers(false), 120)}
          invalid={!!errors.supplierName}
        />
        {showSuppliers && supplierMatches.length > 0 && (
          <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-brand-line rounded-xl shadow-card overflow-hidden">
            {supplierMatches.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onMouseDown={(ev) => ev.preventDefault()}
                  onClick={() => {
                    setSupplierName(s);
                    setShowSuppliers(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-brand-ink hover:bg-brand-cream"
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}
        {errors.supplierName && <FieldError msg={errors.supplierName} />}
      </div>

      <div>
        <Label htmlFor="po">PO ref</Label>
        <Input id="po" autoComplete="off" value={poRef} onChange={(e) => setPoRef(e.target.value)} />
      </div>

      <div>
        <Label htmlFor="invoice">Invoice ref</Label>
        <Input id="invoice" autoComplete="off" value={invoiceRef} onChange={(e) => setInvoiceRef(e.target.value)} />
      </div>

      <div>
        <Label htmlFor="invdate">Invoice date</Label>
        <Input id="invdate" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          rows={2}
          className={inputClasses()}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div>
        <Label>Document photo</Label>
        <GatePhotoInput value={documentPhoto} onChange={setDocumentPhoto} />
      </div>

      <div>
        <Label>Vehicle photo</Label>
        <GatePhotoInput value={vehiclePhoto} onChange={setVehiclePhoto} />
      </div>

      <Button type="submit" fullWidth disabled={submitting} loading={submitting}>
        {submitLabel}
      </Button>

      <button
        type="button"
        onClick={onViewList}
        className="w-full text-sm font-semibold text-brand-accent-2 py-1"
      >
        View today's entries
      </button>
    </form>
  );
}

function FieldError({ msg }: { msg: string }) {
  return (
    <p className="text-xs text-brand-bad mt-1" role="alert">
      {msg}
    </p>
  );
}

/** A single optional photo slot — stores the raw File; uploaded on submit via useAttachments. */
function GatePhotoInput({ value, onChange }: { value: File | null; onChange: (f: File | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  function clear() {
    onChange(null);
    if (ref.current) ref.current.value = "";
  }

  return (
    <div>
      {preview ? (
        <div className="relative">
          <img src={preview} alt="attachment preview" className="w-full max-h-48 object-cover rounded-xl" />
          <button
            type="button"
            onClick={clear}
            aria-label="Remove photo"
            className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-brand-line py-2.5 text-sm text-brand-ink"
        >
          <Camera className="w-4 h-4" /> Add photo
        </button>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
