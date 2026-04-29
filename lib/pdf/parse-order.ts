import pdfParse from "pdf-parse";
import { parseGermanMoney } from "@/lib/money";
import type { ParsedOrder, ParsedOrderPosition } from "@/lib/types";

function normalizeText(text: string) {
  return text.replace(/\r/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function toIsoDate(value: string | undefined | null) {
  if (!value) return null;
  const match = value.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
  if (!match) return null;
  const [, day, month, rawYear] = match;
  const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function findFirst(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function extractCustomer(text: string) {
  if (/Heinz Berger Maschinenfabrik/i.test(text)) {
    return "Heinz Berger Maschinenfabrik GmbH & Co. KG";
  }

  return findFirst(text, [/Kunde\s*:?\s*([^\n]+)/i, /Besteller\s*:?\s*([^\n]+)/i, /Lieferant\s*:?\s*([^\n]+)/i]) || "Unbekannter Kunde";
}

function extractPositions(text: string): ParsedOrderPosition[] {
  const lines = normalizeText(text).split("\n").map((line) => line.trim()).filter(Boolean);
  const positions: ParsedOrderPosition[] = [];
  const positionStart = /^(\d{1,4})\s+([\d.,]+)\s*(Stk\.?|Stück|St|m|mm|kg|Satz|Paar)\s+(.+?)\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})$/i;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = line.match(positionStart);
    if (!match) continue;

    const [, posNumber, quantity, unit, rawDescription, unitPrice, totalPrice] = match;
    const nextLine = lines[index + 1] ?? "";
    const drawingMatch = rawDescription.match(/(?:Zeichnung|Zg\.?|Zeichnungsnr\.?)\s*:?\s*([A-Z0-9_.\-\/]+)/i) ?? nextLine.match(/(?:Zeichnung|Zg\.?|Zeichnungsnr\.?)\s*:?\s*([A-Z0-9_.\-\/]+)/i);

    positions.push({
      pos_number: posNumber,
      quantity: Number.parseFloat(quantity.replace(",", ".")) || 0,
      unit: unit.replace(".", ""),
      description: rawDescription.replace(/\s+(?:Zeichnung|Zg\.?|Zeichnungsnr\.?).*$/i, "").trim(),
      drawing_number: drawingMatch?.[1] ?? null,
      unit_price: parseGermanMoney(unitPrice),
      total_price: parseGermanMoney(totalPrice)
    });
  }

  return positions;
}

export async function parseOrderPdf(buffer: Buffer): Promise<ParsedOrder> {
  const parsed = await pdfParse(buffer);
  const text = normalizeText(parsed.text);
  const orderNumber = findFirst(text, [/Bestell(?:ung|nummer|[\s-]*Nr\.?)\s*:?\s*([A-Z0-9\-\/]+)/i, /Auftrags(?:nummer|[\s-]*Nr\.?)\s*:?\s*([A-Z0-9\-\/]+)/i, /Unsere Bestellung\s*:?\s*([A-Z0-9\-\/]+)/i]);
  const orderDate = toIsoDate(findFirst(text, [/Bestelldatum\s*:?\s*(\d{1,2}\.\d{1,2}\.\d{2,4})/i, /Datum\s*:?\s*(\d{1,2}\.\d{1,2}\.\d{2,4})/i]));
  const deliveryDeadline = toIsoDate(findFirst(text, [/Liefertermin\s*:?\s*(\d{1,2}\.\d{1,2}\.\d{2,4})/i, /Lieferdatum\s*:?\s*(\d{1,2}\.\d{1,2}\.\d{2,4})/i, /gewünschter Liefertermin\s*:?\s*(\d{1,2}\.\d{1,2}\.\d{2,4})/i]));

  return {
    customer_name: extractCustomer(text),
    order_number: orderNumber || `PDF-${Date.now()}`,
    order_date: orderDate,
    delivery_deadline: deliveryDeadline,
    positions: extractPositions(text)
  };
}
