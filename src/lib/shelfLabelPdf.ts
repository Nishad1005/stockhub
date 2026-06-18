// One 100×50mm label per page for a zone's shelves — matches the existing shelf
// labels (header, big code, ZONE n, "Shelf k of total", CODE128, code text).
import JsBarcode from "jsbarcode";
import type { ShelfRow } from "@/types/shelf-row";

const W = 100;
const H = 50;
const FIX_ORDER: Record<string, number> = { S: 0, G: 1, P: 2, R: 3 };

function barcodePng(value: string): string {
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, value, { format: "CODE128", width: 2, height: 40, displayValue: false, margin: 0 });
  return canvas.toDataURL("image/png");
}

/** Build + download a PDF of all labels for one zone (ordered by fixture S,G,P,R then seq). */
export async function buildShelfLabelsPdf(zoneCode: string, shelves: ReadonlyArray<ShelfRow>): Promise<void> {
  const list = shelves
    .filter((s) => s.zone_code === zoneCode)
    .sort((a, b) => (FIX_ORDER[a.fixture_type] - FIX_ORDER[b.fixture_type]) || a.seq - b.seq);
  if (!list.length) throw new Error("No shelves for this zone");
  const total = list.length;
  const zoneNum = parseInt(zoneCode.replace(/\D/g, ""), 10);

  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [W, H] });

  list.forEach((s, i) => {
    if (i > 0) pdf.addPage([W, H], "landscape");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.text("U&M DESIGNS · STORE TANAWADA", 4, 6);
    pdf.text("SHELF LOCATION", W - 4, 6, { align: "right" });

    pdf.setFontSize(20);
    pdf.text(s.code, 4, 18);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.text("ZONE " + zoneNum, 4, 25);
    pdf.setFontSize(8);
    pdf.text(`Shelf ${i + 1} of ${total}`, 4, 30);
    pdf.text("Store Tanawada", 4, 34);

    try {
      pdf.addImage(barcodePng(s.code), "PNG", 4, 36, W - 8, 9);
    } catch {
      /* skip barcode if it can't render */
    }

    pdf.setFontSize(8);
    pdf.text(s.code, W / 2, 49, { align: "center" });
  });

  pdf.save(`UM_${zoneCode}_Labels.pdf`);
}
