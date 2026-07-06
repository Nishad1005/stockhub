/**
 * Item label PDF — one 100×50mm label per page, matching v0.1's label layout
 * (U&M header, big code, name, meta, CODE128 barcode, code text).
 *
 * jsPDF is lazy-imported so its ~weight stays out of the initial bundle.
 */
import JsBarcode from "jsbarcode";

export interface LabelData {
  code: string;
  name: string;
  meta: string;
  qty: number | null;
}

const W = 100;
const H = 50;

function barcodePng(value: string): string {
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, value, { format: "CODE128", width: 2, height: 40, displayValue: false, margin: 0 });
  return canvas.toDataURL("image/png");
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export async function downloadLabelsPdf(labels: LabelData[], filename = "golai-labels.pdf") {
  const { jsPDF } = await import("jspdf");
  // Label is 100×50mm (landscape). Without orientation:"landscape" jsPDF defaults
  // to portrait and swaps the dimensions to 50×100, cutting off the content.
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [W, H] });

  labels.forEach((l, i) => {
    if (i > 0) pdf.addPage([W, H], "landscape");

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.text("U&M DESIGNS · UPHOLSTERY & MORE", 4, 6);
    if (l.qty != null) pdf.text("QTY: " + l.qty, W - 4, 6, { align: "right" });

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text(l.code, 4, 16);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(truncate(l.name, 42), 4, 22);
    pdf.setFontSize(7);
    if (l.meta) pdf.text(truncate(l.meta, 60), 4, 27);

    try {
      pdf.addImage(barcodePng(l.code), "PNG", 4, 30, W - 8, 13);
    } catch {
      /* skip barcode if it can't render */
    }

    pdf.setFontSize(8);
    pdf.text(l.code, W / 2, 48, { align: "center" });
  });

  pdf.save(filename);
}
