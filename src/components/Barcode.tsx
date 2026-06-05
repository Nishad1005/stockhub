import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

export interface BarcodeProps {
  value: string;
  height?: number;
}

/** Renders a CODE128 barcode (v0.1 used JsBarcode the same way). */
export function Barcode({ value, height = 36 }: BarcodeProps) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    try {
      JsBarcode(ref.current, value, {
        format: "CODE128",
        width: 1.6,
        height,
        displayValue: false,
        margin: 0,
      });
    } catch {
      /* invalid value — leave blank */
    }
  }, [value, height]);
  return <svg ref={ref} className="w-full max-w-full" />;
}
