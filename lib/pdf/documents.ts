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

type CustomerAddress = {
  name: string;
  lines: string[];
};

const pageSize: [number, number] = [595, 842];
const marginX = 48;
const tableRight = 547;
const textColor = rgb(0.08, 0.1, 0.12);
const mutedColor = rgb(0.33, 0.38, 0.45);
const lineColor = rgb(0.78, 0.81, 0.85);

const companyLines = [
  "ALDAHHAN-IndustrieTEC",
  "Mobile: 0174 917 74 20",
  "Fax: 02022 65 30 671",
  "Tel: 02022 65 30 672",
  "E-Mail: info@aldahhan-indstrietec.de",
  "Internet: www.aldahhan-industrietec.de",
  "Ust-IdNummer : DE321708720",
  "Steuernummer : 131.5002.4917"
];

const knownAddresses: Array<{ pattern: RegExp; address: CustomerAddress }> = [
  {
    pattern: /Heinz Berger Maschinenfabrik/i,
    address: {
      name: "Heinz Berger Maschinenfabrik GmbH & Co. KG",
      lines: ["Kohlfurther Bruecke 69", "42349 Wuppertal, Germany"]
    }
  },
  {
    pattern: /C\.U\.T|CUT/i,
    address: {
      name: "C.U.T GMBH",
      lines: ["Schimmelbuschstrasse 15", "40699 Erkrath"]
    }
  },
  {
    pattern: /Hans[- ]Werner|Vaupel/i,
    address: {
      name: "Hans-Werner Vaupel GMBH",
      lines: ["Beule 45", "42277 Wuppertal, Germany"]
    }
  },
  {
    pattern: /F[- ]?B[- ]?S|Balke/i,
    address: {
      name: "F-B-S Balke GmbH",
      lines: ["Dellenfeld 34", "42653 Solingen"]
    }
  },
  {
    pattern: /Keil/i,
    address: {
      name: "Keil Befestigungstechnik GmbH",
      lines: ["Olpener Str 13A", "51766 Enkelskirchen"]
    }
  }
];

function drawText(page: PDFPage, text: string, x: number, y: number, size = 10, font?: PDFFont, color = textColor) {
  page.drawText(text.slice(0, 130), { x, y, size, font, color });
}

function drawRight(page: PDFPage, text: string, rightX: number, y: number, size: number, font: PDFFont, color = textColor) {
  page.drawText(text, { x: rightX - font.widthOfTextAtSize(text, size), y, size, font, color });
}

function formatDocumentDate() {
  return new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin" }).format(new Date());
}

function customerAddress(order: Order): CustomerAddress {
  return knownAddresses.find((entry) => entry.pattern.test(order.customer_name))?.address ?? { name: order.customer_name, lines: [] };
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }

  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function drawWrapped(page: PDFPage, text: string, x: number, y: number, maxWidth: number, size: number, font: PDFFont) {
  const lines = wrapText(text, font, size, maxWidth);
  lines.forEach((line, index) => drawText(page, line, x, y - index * 11, size, font));
  return lines.length * 11;
}

function addFirstPageHeader(page: PDFPage, fonts: Fonts, order: Order, kind: DocumentKind, options: DocumentOptions) {
  const title = kind === "rechnung" ? "Rechnung" : "Lieferschein";
  const numberLabel = kind === "rechnung" ? "Rechnung.Nr:" : "Lieferschein.Nr:";
  const address = customerAddress(order);

  drawText(page, companyLines[0], 350, 794, 12, fonts.bold);
  companyLines.slice(1).forEach((line, index) => drawText(page, line, 350, 776 - index * 15, 9, fonts.regular));

  drawText(page, "Aldahhan-IndustrieTEC - Zur Scheuren 22 - 42275 Wuppertal", marginX, 746, 7, fonts.regular, mutedColor);
  drawText(page, address.name, marginX, 716, 10, fonts.regular);
  address.lines.forEach((line, index) => drawText(page, line, marginX, 698 - index * 16, 10, fonts.regular));

  drawText(page, `Datum : ${formatDocumentDate()}`, 350, 642, 10, fonts.regular);
  drawText(page, title, marginX, 610, 20, fonts.bold);

  drawText(page, `${numberLabel} ${options.documentNumber || order.order_number}`, marginX, 576, 10, fonts.regular);
  drawText(page, `Bestellung: ${order.order_number}`, 390, 576, 10, fonts.regular);

  if (kind === "rechnung") {
    drawText(page, "Zahlbar ohne Abzug innerhalb 10 Werktage", marginX, 548, 10, fonts.regular);
    drawText(page, "Falls nichts zusaetzliches vermerkt, entspricht Leistungszeitpunkt d. Rechnungsdatum", marginX, 532, 9, fonts.regular);
    return 488;
  }

  drawText(page, "Wir bedanken uns fuer die Zusammenarbeit und liefern Ihnen vereinbarungsgemaess folgende Teile:", marginX, 528, 10, fonts.regular);
  return 488;
}

function addTableHeader(page: PDFPage, fonts: Fonts, kind: DocumentKind, y: number) {
  page.drawLine({ start: { x: marginX, y: y + 15 }, end: { x: tableRight, y: y + 15 }, thickness: 0.8, color: lineColor });
  drawText(page, "Pos.", marginX, y, 8, fonts.bold);
  drawText(page, "Bezeichnung", 92, y, 8, fonts.bold);
  drawText(page, "Zeichnung", 292, y, 8, fonts.bold);
  drawText(page, "Menge", 392, y, 8, fonts.bold);
  if (kind === "rechnung") {
    drawText(page, "Einzelpreis", 452, y, 8, fonts.bold);
    drawRight(page, "Gesamt", tableRight, y, 8, fonts.bold);
  }
  page.drawLine({ start: { x: marginX, y: y - 8 }, end: { x: tableRight, y: y - 8 }, thickness: 0.8, color: lineColor });
}

function addPage(pdf: PDFDocument, fonts: Fonts, order: Order, kind: DocumentKind, options: DocumentOptions, pageNumber: number) {
  const page = pdf.addPage(pageSize);
  drawRight(page, `Seite ${pageNumber}`, tableRight, 806, 8, fonts.regular, mutedColor);

  if (pageNumber === 1) {
    const tableY = addFirstPageHeader(page, fonts, order, kind, options);
    addTableHeader(page, fonts, kind, tableY);
    return { page, y: tableY - 30 };
  }

  addTableHeader(page, fonts, kind, 780);
  return { page, y: 750 };
}

function rowHeight(positionDescription: string, fonts: Fonts) {
  return Math.max(22, wrapText(positionDescription, fonts.regular, 8, 190).length * 11 + 8);
}

function drawPositionRow(page: PDFPage, fonts: Fonts, orderPosition: NonNullable<Order["positions"]>[number], y: number, kind: DocumentKind) {
  const height = rowHeight(orderPosition.description, fonts);
  drawText(page, orderPosition.pos_number.slice(0, 12), marginX, y, 8, fonts.regular);
  drawWrapped(page, orderPosition.description, 92, y, 190, 8, fonts.regular);
  drawText(page, (orderPosition.drawing_number || "-").slice(0, 20), 292, y, 8, fonts.regular);
  drawText(page, `${orderPosition.quantity} ${orderPosition.unit}`.slice(0, 12), 392, y, 8, fonts.regular);

  if (kind === "rechnung") {
    drawRight(page, formatCurrency(orderPosition.unit_price), 505, y, 8, fonts.regular);
    drawRight(page, formatCurrency(orderPosition.total_price), tableRight, y, 8, fonts.regular);
  }

  page.drawLine({ start: { x: marginX, y: y - height + 6 }, end: { x: tableRight, y: y - height + 6 }, thickness: 0.4, color: rgb(0.9, 0.92, 0.94) });
  return height;
}

function drawInvoiceTotals(page: PDFPage, fonts: Fonts, y: number, positionsTotal: number, shippingCost: number) {
  const nettoTotal = positionsTotal + shippingCost;
  const vat = Number((nettoTotal * 0.19).toFixed(2));
  const bruttoTotal = nettoTotal + vat;
  let currentY = y;

  if (shippingCost > 0) {
    drawText(page, "Versand", 92, currentY, 8, fonts.regular);
    drawText(page, "1", 392, currentY, 8, fonts.regular);
    drawRight(page, formatCurrency(shippingCost), 505, currentY, 8, fonts.regular);
    drawRight(page, formatCurrency(shippingCost), tableRight, currentY, 8, fonts.regular);
    currentY -= 28;
  }

  page.drawLine({ start: { x: 380, y: currentY + 10 }, end: { x: tableRight, y: currentY + 10 }, thickness: 0.8, color: lineColor });
  drawText(page, "Gesamt (netto):", 400, currentY - 6, 10, fonts.bold);
  drawRight(page, formatCurrency(nettoTotal), tableRight, currentY - 6, 10, fonts.bold);
  drawText(page, "19% MwSt.:", 400, currentY - 24, 10, fonts.bold);
  drawRight(page, formatCurrency(vat), tableRight, currentY - 24, 10, fonts.bold);
  drawText(page, "Gesamt (brutto):", 400, currentY - 58, 11, fonts.bold);
  drawRight(page, formatCurrency(bruttoTotal), tableRight, currentY - 58, 11, fonts.bold);
}

function drawDeliverySignature(page: PDFPage, fonts: Fonts, y: number) {
  drawText(page, "Ware Ordnungsgemaess erhalten :", 210, y - 20, 10, fonts.regular);
  page.drawLine({ start: { x: 210, y: y - 55 }, end: { x: 470, y: y - 55 }, thickness: 0.8, color: rgb(0.25, 0.29, 0.33) });
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
    const height = rowHeight(position.description, fonts);
    if (y - height < 90) {
      pageNumber += 1;
      ({ page, y } = addPage(pdf, fonts, order, kind, options, pageNumber));
    }

    drawPositionRow(page, fonts, position, y, kind);
    total += position.total_price ?? 0;
    y -= height;
  }

  if (kind === "rechnung") {
    const shippingCost = options.shippingCost ?? 0;
    if (y < 120 + (shippingCost > 0 ? 28 : 0)) {
      pageNumber += 1;
      ({ page, y } = addPage(pdf, fonts, order, kind, options, pageNumber));
    }
    drawInvoiceTotals(page, fonts, y - 12, total, shippingCost);
  } else {
    if (y < 126) {
      pageNumber += 1;
      ({ page, y } = addPage(pdf, fonts, order, kind, options, pageNumber));
    }
    drawDeliverySignature(page, fonts, y - 18);
  }

  return pdf.save();
}
