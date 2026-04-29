import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatDate } from "@/lib/date";
import { formatCurrency } from "@/lib/money";
import type { Order } from "@/lib/types";

type DocumentKind = "rechnung" | "lieferschein";

function drawText(page: import("pdf-lib").PDFPage, text: string, x: number, y: number, size = 10) {
  page.drawText(text.slice(0, 110), { x, y, size, color: rgb(0.08, 0.1, 0.12) });
}

export async function generateOrderDocument(order: Order, kind: DocumentKind) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const title = kind === "rechnung" ? "Rechnung" : "Lieferschein";
  const positions = order.positions ?? [];

  page.setFont(regular);
  page.drawText("CNC Werkstatt", { x: 48, y: 792, size: 11, font: bold, color: rgb(0.1, 0.13, 0.16) });
  page.drawText(title, { x: 48, y: 732, size: 28, font: bold, color: rgb(0.1, 0.13, 0.16) });

  drawText(page, `Kunde: ${order.customer_name}`, 48, 690, 11);
  drawText(page, `Bestellung: ${order.order_number}`, 48, 672, 11);
  drawText(page, `Bestelldatum: ${formatDate(order.order_date)}`, 48, 654, 11);
  drawText(page, `Liefertermin: ${formatDate(order.delivery_deadline)}`, 48, 636, 11);

  page.drawLine({ start: { x: 48, y: 600 }, end: { x: 547, y: 600 }, thickness: 1, color: rgb(0.82, 0.85, 0.88) });
  page.drawText("Pos", { x: 48, y: 580, size: 9, font: bold });
  page.drawText("Menge", { x: 86, y: 580, size: 9, font: bold });
  page.drawText("Beschreibung", { x: 150, y: 580, size: 9, font: bold });
  page.drawText(kind === "rechnung" ? "Gesamt" : "Zeichnung", { x: 470, y: 580, size: 9, font: bold });

  let y = 556;
  let total = 0;
  for (const position of positions) {
    page.drawText(position.pos_number, { x: 48, y, size: 9, font: regular });
    page.drawText(`${position.quantity} ${position.unit}`, { x: 86, y, size: 9, font: regular });
    page.drawText(position.description.slice(0, 58), { x: 150, y, size: 9, font: regular });
    const value = kind === "rechnung" ? formatCurrency(position.total_price) : position.drawing_number || "-";
    page.drawText(value.slice(0, 18), { x: 470, y, size: 9, font: regular });
    total += position.total_price ?? 0;
    y -= 22;
    if (y < 96) break;
  }

  if (kind === "rechnung") {
    page.drawLine({ start: { x: 390, y: 104 }, end: { x: 547, y: 104 }, thickness: 1, color: rgb(0.25, 0.29, 0.33) });
    page.drawText(`Summe netto: ${formatCurrency(total)}`, { x: 390, y: 78, size: 12, font: bold });
  } else {
    drawText(page, "Ware erhalten:", 48, 88, 10);
    page.drawLine({ start: { x: 132, y: 86 }, end: { x: 320, y: 86 }, thickness: 1, color: rgb(0.25, 0.29, 0.33) });
  }

  return pdf.save();
}
