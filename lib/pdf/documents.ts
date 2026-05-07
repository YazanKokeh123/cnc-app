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

function addDocumentHeader(page: PDFPage, fonts: Fonts, order: Order, kind: DocumentKind, options: DocumentOptions) {
  const title = kind === "rechnung" ? "Rechnung" : "Lieferschein";
  const numberLabel = kind === "rechnung" ? "Rechnungsnummer" : "Lieferscheinnummer";

  page.drawText("CNC Werkstatt", { x: 48, y: 792, size: 11, font: fonts.bold, color: rgb(0.1, 0.13, 0.16) });
  page.drawText(title, { x: 48, y: 742, size: 26, font: fonts.bold, color: rgb(0.1, 0.13, 0.16) });
  if (options.documentNumber) drawText(page, `${numberLabel}: ${options.documentNumber}`, 360, 752, 10, fonts.bold);

  drawText(page, `Kunde: ${order.customer_name}`, 48, 704, 10, fonts.regular);
  drawText(page, `Bestellung: ${order.order_number}`, 48, 686, 10, fonts.regular);
  drawText(page, `Bestelldatum: ${formatDate(order.order_date)}`, 48, 668, 10, fonts.regular);
  drawText(page, `Liefertermin: ${formatDate(order.delivery_deadline)}`, 48, 650, 10, fonts.regular);
}

function addTableHeader(page: PDFPage, fonts: Fonts, kind: DocumentKind, y: number) {
  page.drawLine({ start: { x: 48, y: y + 20 }, end: { x: 547, y: y + 20 }, thickness: 1, color: rgb(0.82, 0.85, 0.88) });
  page.drawText("Pos", { x: 48, y, size: 8, font: fonts.bold });
  page.drawText("Menge", { x: 86, y, size: 8, font: fonts.bold });
  page.drawText("Beschreibung", { x: 145, y, size: 8, font: fonts.bold });
  page.drawText("Zeichnung", { x: 330, y, size: 8, font: fonts.bold });
  if (kind === "rechnung") {
    page.drawText("EP", { x: 430, y, size: 8, font: fonts.bold });
    page.drawText("Gesamt", { x: 500, y, size: 8, font: fonts.bold });
  }
}

function addPage(pdf: PDFDocument, fonts: Fonts, order: Order, kind: DocumentKind, options: DocumentOptions, pageNumber: number) {
  const page = pdf.addPage(pageSize);
  drawText(page, `Seite: ${pageNumber}`, 480, 792, 9, fonts.regular);

  if (pageNumber === 1) {
    addDocumentHeader(page, fonts, order, kind, options);
    addTableHeader(page, fonts, kind, 596);
    return { page, y: 572 };
  }

  const title = kind === "rechnung" ? "Rechnung" : "Lieferschein";
  drawText(page, `${title} ${options.documentNumber || order.order_number} - Fortsetzung`, 48, 792, 10, fonts.bold);
  addTableHeader(page, fonts, kind, 752);
  return { page, y: 728 };
}

export async function generateOrderDocument(order: Order, kind: DocumentKind, options: DocumentOptions = {}) {
  const pdf = await PDFDocument.create();
  const fonts = {
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    regular: await pdf.embedFont(StandardFonts.Helvetica)
  };
  const positions = order.positions ?? [];
  let pageNumber = 1;
  let { page, y } = addPage(pdf, fonts, order, kind, options, pageNumber);
  let total = 0;

  for (const position of positions) {
    if (y < 86) {
      pageNumber += 1;
      ({ page, y } = addPage(pdf, fonts, order, kind, options, pageNumber));
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
    const nettoTotal = total + shippingCost;
    const vat = Number((nettoTotal * 0.19).toFixed(2));
    const bruttoTotal = nettoTotal + vat;
    if (y < 150) {
      pageNumber += 1;
      ({ page, y } = addPage(pdf, fonts, order, kind, options, pageNumber));
    }
    page.drawLine({ start: { x: 360, y: y - 8 }, end: { x: 547, y: y - 8 }, thickness: 1, color: rgb(0.25, 0.29, 0.33) });
    page.drawText(`Positionen netto: ${formatCurrency(total)}`, { x: 360, y: y - 30, size: 10, font: fonts.bold });
    if (shippingCost > 0) page.drawText(`Versand netto: ${formatCurrency(shippingCost)}`, { x: 360, y: y - 48, size: 10, font: fonts.bold });
    page.drawText(`Summe netto: ${formatCurrency(nettoTotal)}`, { x: 360, y: y - 70, size: 11, font: fonts.bold });
    page.drawText(`MwSt. 19%: ${formatCurrency(vat)}`, { x: 360, y: y - 90, size: 11, font: fonts.bold });
    page.drawText(`Summe brutto: ${formatCurrency(bruttoTotal)}`, { x: 360, y: y - 112, size: 12, font: fonts.bold });
  } else {
    if (y < 126) {
      pageNumber += 1;
      ({ page, y } = addPage(pdf, fonts, order, kind, options, pageNumber));
    }
    drawText(page, "Ware erhalten:", 48, y - 38, 10, fonts.regular);
    page.drawLine({ start: { x: 132, y: y - 40 }, end: { x: 320, y: y - 40 }, thickness: 1, color: rgb(0.25, 0.29, 0.33) });
  }

  return pdf.save();
}
