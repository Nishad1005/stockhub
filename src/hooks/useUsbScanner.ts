import { useEffect, useRef } from "react";
import { USB_KEYSTROKE_GAP_MS } from "@/constants/shelf";
import { validateShelf } from "@/lib/shelf-validator";

const MIN_LEN = 5; // v0.1: usbBuffer.length >= 5

/**
 * Global USB/Bluetooth keyboard-wedge scanner detection — port of v0.1
 * handleUsbScannerKey. Buffers single-char keystrokes; if they arrive faster
 * than USB_KEYSTROKE_GAP_MS and end in Enter and match SHELF_RE, it's a scan.
 * Ignores keystrokes while a normal (non-readonly) input is focused so real
 * typing isn't hijacked.
 */
export function useUsbScanner(onShelfScan: (code: string) => void, enabled = true) {
  const cb = useRef(onShelfScan);
  cb.current = onShelfScan;
  const buf = useRef("");
  const last = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    function onKey(ev: KeyboardEvent) {
      const t = ev.target as HTMLElement | null;
      const tag = t?.tagName;
      const input = t as HTMLInputElement | null;
      const isTextInput =
        (tag === "INPUT" && input?.type !== "checkbox" && input?.type !== "button") ||
        tag === "TEXTAREA" ||
        tag === "SELECT";
      const isReadOnly = !!input && (input.readOnly || input.disabled);
      if (isTextInput && !isReadOnly) return; // real typing — leave it alone

      const now = Date.now();
      if (now - last.current > USB_KEYSTROKE_GAP_MS) buf.current = "";
      last.current = now;

      if (ev.key === "Enter") {
        const candidate = buf.current.trim().toUpperCase();
        buf.current = "";
        if (candidate.length >= MIN_LEN) {
          const v = validateShelf(candidate);
          if (v.ok && v.code) {
            ev.preventDefault();
            cb.current(v.code);
          }
        }
        return;
      }
      if (ev.key && ev.key.length === 1) buf.current += ev.key;
    }
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [enabled]);
}
