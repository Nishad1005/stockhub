import { useState } from "react";
import { ZONE_INDEX } from "@/constants/zones";
import { FIXTURE_NAMES } from "@/constants/shelf";
import { useCaptureSession } from "@/stores/captureSession";
import { useSessionStore } from "@/stores/session";
import { useCreateEntry } from "@/hooks/useCreateEntry";
import { usePermissions } from "@/hooks/usePermissions";
import { useUsbScanner } from "@/hooks/useUsbScanner";
import { CameraScanner } from "@/components/CameraScanner";
import { uploadEntryPhoto } from "@/lib/photo";
import { errMessage } from "@/lib/errors";
import { toast } from "@/stores/toast";
import { ShelfCard } from "./ShelfCard";
import { ItemForm, type ItemFormPayload } from "./ItemForm";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Button } from "@/components/ui/Button";

/**
 * Capture screen — the primary data-entry surface (docs/migration/01-capture.md).
 * Shelf scan (camera + USB + manual) auto-sets the zone; the shelf stays sticky
 * across saves; items are matched against the master or saved as NEW.
 */
export function CaptureScreen() {
  const { activeZone, activeShelf, applyShelf } = useCaptureSession();
  const createEntry = useCreateEntry();
  const manualEntryMode = useSessionStore((s) => s.manualEntryMode);
  const setManualEntryMode = useSessionStore((s) => s.setManualEntryMode);
  const [scannerOpen, setScannerOpen] = useState(false);
  const { can, isLoading: permsLoading } = usePermissions();

  // Shared shelf-apply with toasts (used by camera, USB, and manual typing).
  function applyShelfWithToast(raw: string) {
    const r = applyShelf(raw);
    if (!r.ok || !r.code || !r.fixtureType) {
      toast(`Not a location code: ${raw} — expected Z#-S/G/P/R###`, "warn");
      return;
    }
    toast(`${FIXTURE_NAMES[r.fixtureType]} set: ${r.code}`, "ok");
    if (r.zoneChanged && r.zoneCode) {
      const z = ZONE_INDEX[r.zoneCode];
      toast(`Zone auto-set: ${r.zoneCode} — ${z?.name ?? ""}`, "ok");
    }
  }

  // Global USB/Bluetooth scanner — only active while this screen is mounted.
  useUsbScanner(applyShelfWithToast);

  async function handleSubmit(p: ItemFormPayload) {
    if (!activeShelf) {
      toast("Scan a shelf first", "warn");
      throw new Error("no shelf");
    }
    let photoUrl: string | null = null;
    try {
      if (p.photoDataUrl) photoUrl = await uploadEntryPhoto(p.photoDataUrl);
    } catch (e) {
      toast("Photo upload failed: " + errMessage(e), "err");
      throw e; // keep the form so the user can retry / drop the photo
    }
    try {
      await createEntry.mutateAsync({
        shelfCode: activeShelf,
        name: p.name,
        qty: p.qty,
        masterCode: p.masterCode,
        scannedBarcode: p.scannedBarcode,
        defn: p.defn,
        category: p.category,
        notes: p.notes,
        photoUrl,
      });
      toast(`Saved: ${p.name.trim()} @ ${activeShelf}`, "ok");
    } catch (e) {
      toast("Save failed: " + errMessage(e), "err");
      throw e;
    }
  }

  const ready = !!activeZone && !!activeShelf;

  return (
    <div className="min-h-screen bg-brand-cream text-brand-ink">
      <ScreenHeader
        title="Capture"
        action={
          <Button
            variant={manualEntryMode ? "danger" : "secondary"}
            size="sm"
            onClick={() => setManualEntryMode(!manualEntryMode)}
          >
            {manualEntryMode ? "⌨ Manual ON" : "⌨ Type shelf"}
          </Button>
        }
      />

      <main className="px-4 pb-24 max-w-md mx-auto">
        {permsLoading ? null : !can("capture") ? (
          <p className="text-sm text-brand-mute text-center mt-8">
            You don't have permission to capture items.
          </p>
        ) : (
          <>
            <ShelfCard onScanClick={() => setScannerOpen(true)} onApplyShelf={applyShelfWithToast} />
            {ready ? (
              <ItemForm activeZone={activeZone} submitting={createEntry.isPending} onSubmit={handleSubmit} />
            ) : (
              <p className="text-sm text-brand-mute text-center mt-8">
                Scan a shelf barcode to start capturing items.
              </p>
            )}
          </>
        )}
      </main>

      <CameraScanner
        open={scannerOpen}
        title="Scan shelf / fixture barcode"
        onClose={() => setScannerOpen(false)}
        onDetected={(code) => {
          setScannerOpen(false);
          applyShelfWithToast(code);
        }}
      />

    </div>
  );
}
