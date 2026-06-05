import { useEffect, useRef } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { toast } from "@/stores/toast";
import { errMessage } from "@/lib/errors";

export interface CameraScannerProps {
  open: boolean;
  title?: string;
  onDetected: (code: string) => void;
  onClose: () => void;
}

const REGION_ID = "scanner-region";
const msg = errMessage;

/** Camera barcode scanner modal — web via html5-qrcode (v0.1 openScanner). */
export function CameraScanner({ open, title = "Scan barcode", onDetected, onClose }: CameraScannerProps) {
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

    let scanner: Html5Qrcode | null = null;
    let stopped = false;
    try {
      scanner = new Html5Qrcode(REGION_ID, {
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

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 280, height: 160 } },
        (decoded) => {
          if (!stopped) detected.current(decoded);
        },
        () => {},
      )
      .catch((err: unknown) => {
        toast("Camera failed: " + msg(err), "err");
        close.current();
      });

    return () => {
      stopped = true;
      const s = scanner;
      if (!s) return;
      try {
        const r = s.stop();
        if (r && typeof r.then === "function") {
          r.then(() => s.clear()).catch(() => {});
        }
      } catch {
        try {
          s.clear();
        } catch {
          /* ignore */
        }
      }
    };
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
