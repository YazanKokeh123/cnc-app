import { PDFDocument, PDFPage, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { formatDate } from "@/lib/date";
import { formatCurrency } from "@/lib/money";
import type { Order } from "@/lib/types";

type DocumentKind = "rechnung" | "lieferschein";

type DocumentOptions = {
  documentNumber?: string;
  shippingCost?: number | null;
};

type Fonts = {
  bold: PDFFont;
  regular: PDFFont;
};

const pageSize: [number, number] = [595, 842];

function drawText(page: PDFPage, text: string, x: number, y: number, size = 10, font?: PDFFont) {
  page.drawText(text.slice(0, 105), { x, y, size, font, color: rgb(0.08, 0.1, 0.12) });
}

function addHeader(pdf: PDFDocument, fonts: Fonts, order: Order, kind: DocumentKind, options: DocumentOptions, pageNumber: number) {
  const page = pdf.addPage(pageSize);
  const title = kind === "rechnung" ? "Rechnung" : "Lieferschein";
  const numberLabel = kind === "rechnung" ? "Rechnungsnummer" : "Lieferscheinnummer";

  page.drawText("CNC Werkstatt", { x: 48, y: 792, size: 11, font: fonts.bold, color: rgb(0.1, 0.13, 0.16) });
  page.drawText(title, { x: 48, y: 742, size: 26, font: fonts.bold, color: rgb(0.1, 0.13, 0.16) });
  if (options.documentNumber) drawText(page, `${numberLabel}: ${options.documentNumber}`, 360, 752, 10, fonts.bold);
  drawText(page, `Seite: ${pageNumber}`, 480, 792, 9, fonts.regular);

  drawText(page, `Kunde: ${order.customer_name}`, 48, 704, 10, fonts.regular);
  drawText(page, `Bestellung: ${order.order_number}`, 48, 686, 10, fonts.regular);
  drawText(page, `Bestelldatum: ${formatDate(order.order_date)}`, 48, 668, 10, fonts.regular);
  drawText(page, `Liefertermin: ${formatDate(order.delivery_deadline)}`, 48, 650, 10, fonts.regular);

  page.drawLine({ start: { x: 48, y: 616 }, end: { x: 547, y: 616 }, thickness: 1, color: rgb(0.82, 0.85, 0.88) });
  page.drawText("Pos", { x: 48, y: 596, size: 8, font: fonts.bold });
  page.drawText("Menge", { x: 86, y: 596, size: 8, font: fonts.bold });
  page.drawText("Beschreibung", { x: 145, y: 596, size: 8, font: fonts.bold });
  page.drawText("Zeichnung", { x: 330, y: 596, size: 8, font: fonts.bold });
  if (kind === "rechnung") {
    page.drawText("EP", { x: 430, y: 596, size: 8, font: fonts.bold });
    page.drawText("Gesamt", { x: 500, y: 596, size: 8, font: fonts.bold });
  }

  return page;
}

export async function generateOrderDocument(order: Order, kind: DocumentKind, options: DocumentOptions = {}) {
  const pdf = await PDFDocument.create();
  const fonts = {
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    regular: await pdf.embedFont(StandardFonts.Helvetica)
  };
  const positions = order.positions ?? [];
  let pageNumber = 1;
  let page = addHeader(pdf, fonts, order, kind, options, pageNumber);
  let y = 572;
  let total = 0;

  for (const position of positions) {
    if (y < 86) {
      pageNumber += 1;
      page = addHeader(pdf, fonts, order, kind, options, pageNumber);
      y = 572;
    }

    page.drawText(position.pos_number.slice(0, 9), { x: 48, y, size: 8, font: fonts.regular });
    page.drawText(`${position.quantity} ${position.unit}`.slice(0, 10), { x: 86, y, size: 8, font: fonts.regular });
    page.drawText(position.description.slice(0, 36), { x: 145, y, size: 8, font: fonts.regular });
    page.drawText((position.drawing_number || "-").slice(0, 18), { x: 330, y, size: 8, font: fonts.regular });

    if (kind === "rechnung") {
      page.drawText(formatCurrency(position.unit_price).slice(0, 14), { x: 430, y, size: 8, font: fonts.regular });
      page.drawText(formatCurrency(position.total_price).slice(0, 14), { x: 500, y, size: 8, font: fonts.regular });
    }

    total += position.total_price ?? 0;
    y -= 18;
  }

  if (kind === "rechnung") {
    const shippingCost = options.shippingCost ?? 0;
    const finalTotal = total + shippingCost;
    if (y < 128) {
      pageNumber += 1;
      page = addHeader(pdf, fonts, order, kind, options, pageNumber);
      y = 572;
    }
    page.drawLine({ start: { x: 360, y: y - 8 }, end: { x: 547, y: y - 8 }, thickness: 1, color: rgb(0.25, 0.29, 0.33) });
    page.drawText(`Positionen netto: ${formatCurrency(total)}`, { x: 360, y: y - 30, size: 10, font: fonts.bold });
    if (shippingCost > 0) page.drawText(`Versand netto: ${formatCurrency(shippingCost)}`, { x: 360, y: y - 48, size: 10, font: fonts.bold });
    page.drawText(`Summe netto: ${formatCurrency(finalTotal)}`, { x: 360, y: y - 70, size: 12, font: fonts.bold });
  } else {
    if (y < 126) {
      pageNumber += 1;
      page = addHeader(pdf, fonts, order, kind, options, pageNumber);
      y = 572;
    }
    drawText(page, "Ware erhalten:", 48, y - 38, 10, fonts.regular);
    page.drawLine({ start: { x: 132, y: y - 40 }, end: { x: 320, y: y - 40 }, thickness: 1, color: rgb(0.25, 0.29, 0.33) });
  }

  return pdf.save();
}
