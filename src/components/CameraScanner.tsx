import { useEffect, useId, useRef } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { toast } from "@/stores/toast";
import { errMessage } from "@/lib/errors";

export interface CameraScannerProps {
  open: boolean;
  title?: string;
  onDetected: (code: string) => void;
  onClose: () => void;
}

const msg = errMessage;

/** Camera barcode scanner modal — web via html5-qrcode (v0.1 openScanner). */
export function CameraScanner({ open, title = "Scan barcode", onDetected, onClose }: CameraScannerProps) {
  // Region id created EXACTLY ONCE per instance and pinned in a ref — never
  // recomputed on re-render and never an effect dependency, so nothing but `open`
  // can tear down / restart the camera. (useId can contain ':', invalid in a DOM id.)
  const generatedId = useId();
  const regionRef = useRef<string | null>(null);
  if (regionRef.current === null) {
    regionRef.current = `scanner-region-${generatedId.replace(/:/g, "")}`;
  }
  const REGION_ID = regionRef.current;
  const detected = useRef(onDetected);
  detected.current = onDetected;
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    if (!open) return;

    // Camera needs a secure context (https or localhost). On a LAN IP over http
    // (e.g. testing from a phone) getUserMedia is blocked — fail gracefully.
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      toast("Camera needs HTTPS or localhost. Use manual entry, or open the app over https.", "warn");
      close.current();
      return;
    }

    const el = document.getElementById(REGION_ID);
    if (!el) return;

    let created: Html5Qrcode;
    try {
      created = new Html5Qrcode(REGION_ID, {
        verbose: false,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
        ],
      });
    } catch (e) {
      toast("Scanner init failed: " + msg(e), "err");
      close.current();
      return;
    }
    const scanner = created;

    // Guard the async start/stop lifecycle. Calling stop() before start() resolves
    // throws and ORPHANS the camera stream (the React-18-StrictMode / any-remount
    // trap): the visible video keeps running while the decode loop is dead. So we
    // only stop a scanner that actually started; if we were cancelled mid-startup,
    // we stop it the moment start() resolves.
    let cancelled = false;
    let started = false;
    const stopScanner = () => {
      try {
        const r = scanner.stop();
        if (r && typeof r.then === "function") r.then(() => scanner.clear()).catch(() => {});
      } catch {
        try {
          scanner.clear();
        } catch {
          /* ignore */
        }
      }
    };

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 280, height: 160 } },
        (decoded) => {
          if (!cancelled) detected.current(decoded);
        },
        () => {},
      )
      .then(() => {
        started = true;
        if (cancelled) stopScanner(); // unmounted during startup — safe to stop now
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          toast("Camera failed: " + msg(err), "err");
          close.current();
        }
      });

    return () => {
      cancelled = true;
      if (started) stopScanner(); // else the .then() above stops it once start resolves
    };
    // REGION_ID is a stable ref value, intentionally not a dep (only `open` restarts).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="bg-white rounded-xl p-4 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-brand-ink">{title}</h2>
          <button onClick={onClose} className="text-brand-mute text-lg leading-none px-1">
            ✕
          </button>
        </div>
        <div id={REGION_ID} className="w-full overflow-hidden rounded-lg bg-black min-h-[220px]" />
        <p className="text-xs text-brand-mute mt-3 text-center">Point the camera at the barcode.</p>
      </div>
    </div>
  );
}
