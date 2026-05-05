import { inflateSync } from "node:zlib";
import pdfParse from "pdf-parse";
import { parseGermanMoney } from "@/lib/money";
import type { ParsedOrder, ParsedOrderPosition } from "@/lib/types";

type PdfTextItem = { stream: number; x: number; y: number; text: string };

function normalizeText(text: string) {
  return text.replace(/\r/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function toIsoDate(value: string | undefined | null) {
  if (!value) return null;
  const match = value.replace(/\s+/g, "").match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
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
  if (/Heinz Berger Maschinenfabrik/i.test(text)) return "Heinz Berger Maschinenfabrik GmbH & Co. KG";
  return findFirst(text, [/Kunde\s*:?\s*([^\n]+)/i, /Besteller\s*:?\s*([^\n]+)/i, /Lieferant\s*:?\s*([^\n]+)/i]) || "Unbekannter Kunde";
}

function extractLinePositions(text: string): ParsedOrderPosition[] {
  const lines = normalizeText(text).split("\n").map((line) => line.trim()).filter(Boolean);
  const positions: ParsedOrderPosition[] = [];
  const positionStart = /^(\d{1,4})\s+([\d.,]+)\s*(Stk\.?|St|m|mm|kg|Satz|Paar)\s+(.+?)\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})$/i;

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(positionStart);
    if (!match) continue;
    const [, posNumber, quantity, unit, rawDescription, unitPrice, totalPrice] = match;
    const nextLine = lines[index + 1] ?? "";
    const drawingMatch = rawDescription.match(/(?:Zeichnung|Zg\.?|Zeichnungsnr\.?)\s*:?\s*([A-Z0-9_.\-/]+)/i) ?? nextLine.match(/(?:Zeichnung|Zg\.?|Zeichnungsnr\.?)\s*:?\s*([A-Z0-9_.\-/]+)/i);
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

function decodePdfString(value: string) {
  return value.replace(/\\([()\\])/g, "$1").replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t");
}

function decodePdfTextArray(value: string) {
  return [...value.matchAll(/\(((?:\\.|[^\\)])*)\)/g)].map((match) => decodePdfString(match[1])).join("").trim();
}

function extractPositionedText(buffer: Buffer): PdfTextItem[] {
  const items: PdfTextItem[] = [];
  const source = buffer.toString("latin1");
  const streamPattern = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let streamIndex = 0;

  for (const streamMatch of source.matchAll(streamPattern)) {
    let inflated = "";
    try {
      inflated = inflateSync(Buffer.from(streamMatch[1], "latin1")).toString("latin1");
    } catch {
      streamIndex += 1;
      continue;
    }

    if (!inflated.includes(" Tm") || !inflated.includes("TJ")) {
      streamIndex += 1;
      continue;
    }

    const textPattern = /1\s+0\s+0\s+-1\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+Tm\s*\[([\s\S]*?)\]\s*TJ/g;
    for (const textMatch of inflated.matchAll(textPattern)) {
      const text = decodePdfTextArray(textMatch[3]);
      if (text) items.push({ stream: streamIndex, x: Number(textMatch[1]), y: Number(textMatch[2]), text });
    }
    streamIndex += 1;
  }

  return items;
}

function cleanDescription(value: string) {
  return value.replace(/\s+([.,/])/g, "$1").replace(/\s{2,}/g, " ").trim();
}

function cleanDrawingNumber(value: string) {
  const cleaned = value.replace(/\s+/g, "").replace(/--+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned || null;
}

function isFooterText(text: string) {
  return /Stadtsparkasse|Volksbank|IBAN|SWIFT|\bBIC\b|Wuppertal|Gesch[aä]ftsf[uü]hrer|Amtsgericht|USt-?Id|www\.|@/.test(text);
}

function mergeDuplicatePositions(positions: ParsedOrderPosition[]) {
  const merged = new Map<string, ParsedOrderPosition>();
  for (const position of positions) {
    const key = [position.description.toLowerCase().replace(/\s+/g, " ").trim(), position.drawing_number?.toLowerCase().replace(/\s+/g, "") ?? ""].join("|");
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...position });
      continue;
    }
    existing.pos_number = `${existing.pos_number}, ${position.pos_number}`;
    existing.quantity += position.quantity;
    existing.total_price = (existing.total_price ?? 0) + (position.total_price ?? 0);
    if (existing.total_price !== null && existing.quantity > 0) {
      existing.unit_price = Number((existing.total_price / existing.quantity).toFixed(2));
    }
  }
  return [...merged.values()];
}

function compareItemPosition(left: PdfTextItem, right: PdfTextItem) {
  return left.stream - right.stream || left.y - right.y || left.x - right.x;
}

function earliestItem(...items: Array<PdfTextItem | null | undefined>) {
  return items.filter(Boolean).sort(compareItemPosition)[0];
}

function isAfterPositionStart(item: PdfTextItem, start: PdfTextItem) {
  return item.stream > start.stream || (item.stream === start.stream && item.y >= start.y - 2);
}

function isBeforeNextPosition(item: PdfTextItem, nextStart: PdfTextItem | undefined) {
  if (!nextStart) return true;
  return item.stream < nextStart.stream || (item.stream === nextStart.stream && item.y < nextStart.y - 2);
}

function isHeinzBergerPositionStart(item: PdfTextItem, pageItems: PdfTextItem[]) {
  if (item.x < 80 || item.x > 145 || item.y < 350 || !/^\d{1,4}$/.test(item.text)) return false;
  const sameLine = pageItems.filter((candidate) => candidate.stream === item.stream && Math.abs(candidate.y - item.y) <= 3);
  return sameLine.some((candidate) => candidate.x >= 420 && candidate.x <= 490 && /^\d+(?:[,.]\d+)?$/.test(candidate.text.trim())) && sameLine.some((candidate) => candidate.x >= 430 && candidate.x <= 525 && /ST|St/i.test(candidate.text)) && sameLine.some((candidate) => candidate.x >= 560 && candidate.x <= 1300);
}

function parsePositionedHeinzBerger(items: PdfTextItem[]) {
  const positions: ParsedOrderPosition[] = [];
  const deliveryDates: string[] = [];
  const orderedItems = [...items].sort(compareItemPosition);
  const textInReadingOrder = orderedItems.map((item) => item.text).join(" ");
  const orderHeaderDate = textInReadingOrder.match(/Bestellung\s+\d+\s+vom\s+(\d{1,2}\s*\.?\s*\d{1,2}\s*\.?\s*\d{4})/i)?.[1];
  const starts = orderedItems.filter((item) => isHeinzBergerPositionStart(item, orderedItems));

  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index];
    const nextStart = starts[index + 1];
    const block = orderedItems.filter((item) => isAfterPositionStart(item, start) && isBeforeNextPosition(item, nextStart));
    const footerStart = block.find((item) => item.x >= 520 && isFooterText(item.text));
    const contentBlock = footerStart ? block.filter((item) => compareItemPosition(item, footerStart) < 0) : block;
    const sameLine = contentBlock.filter((item) => item.stream === start.stream && Math.abs(item.y - start.y) <= 3);
    const quantityText = sameLine.find((item) => item.x >= 420 && item.x <= 490 && /^\d+(?:[,.]\d+)?$/.test(item.text.trim()))?.text;
    const unitText = sameLine.find((item) => item.x >= 430 && item.x <= 525 && /ST|St/i.test(item.text))?.text.trim() || "ST";
    const drawingLabel = contentBlock.find((item) => item.x >= 560 && item.x <= 850 && /Zeichnu|ngsnr/i.test(item.text));
    const fallbackDescriptionEnd = { ...start, y: start.y + 120 };
    const descriptionEnd = earliestItem(drawingLabel, footerStart, fallbackDescriptionEnd) ?? fallbackDescriptionEnd;
    const description = cleanDescription(contentBlock.filter((item) => item.x >= 560 && item.x <= 1300 && compareItemPosition(item, descriptionEnd) < 0 && !isFooterText(item.text) && !/Liefer|Position|Zeich|Hersteller|Artikel|Auftrag/i.test(item.text)).sort(compareItemPosition).map((item) => item.text.trim()).join(" "));
    const drawingNumber = drawingLabel ? cleanDrawingNumber(contentBlock.filter((item) => item.stream === drawingLabel.stream && item.y >= drawingLabel.y - 3 && item.y <= drawingLabel.y + 3 && item.x >= 1300 && item.x <= 1700).sort((a, b) => a.x - b.x).map((item) => item.text.trim()).join("")) : null;
    const deliveryDate = contentBlock.filter((item) => item.x >= 1450 && item.x <= 1605).map((item) => item.text.replace(/\s+/g, "")).find((text) => /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(text));
    if (deliveryDate) deliveryDates.push(deliveryDate);
    const priceLine = contentBlock.find((item) => item.x >= 560 && item.x <= 850 && /Positionspreis/i.test(item.text));
    const priceItems = priceLine ? contentBlock.filter((item) => item.stream === priceLine.stream && Math.abs(item.y - priceLine.y) <= 3) : [];
    const unitPriceText = priceItems.filter((item) => item.x >= 1560 && item.x <= 1645 && /^[\d,]+$/.test(item.text.trim())).sort((a, b) => a.y - b.y || a.x - b.x).map((item) => item.text.trim()).join("");
    const totalPriceText = priceItems.filter((item) => item.x >= 2100 && item.x <= 2240 && /[\d,]/.test(item.text)).sort((a, b) => a.y - b.y || a.x - b.x).map((item) => item.text.trim()).join("");
    if (!description) continue;
    positions.push({
      pos_number: start.text,
      quantity: Number.parseFloat((quantityText ?? "0").replace(",", ".")) || 0,
      unit: unitText.replace(".", "").trim(),
      description,
      drawing_number: drawingNumber,
      unit_price: parseGermanMoney(unitPriceText),
      total_price: parseGermanMoney(totalPriceText)
    });
  }

  return { orderDate: toIsoDate(orderHeaderDate), deliveryDeadline: deliveryDates.map(toIsoDate).filter(Boolean).sort()[0] ?? null, positions: mergeDuplicatePositions(positions) };
}

export async function parseOrderPdf(buffer: Buffer): Promise<ParsedOrder> {
  const parsed = await pdfParse(buffer);
  const text = normalizeText(parsed.text);
  const positionedText = /Heinz Berger Maschinenfabrik/i.test(text) ? extractPositionedText(buffer) : [];
  const heinzBerger = positionedText.length ? parsePositionedHeinzBerger(positionedText) : null;
  const orderNumber = findFirst(text, [/Bestellung\s+(\d+)/i, /Bestell(?:ung|nummer|[\s-]*Nr\.?)\s*:?\s*([A-Z0-9\-/]+)/i, /Auftrags(?:nummer|[\s-]*Nr\.?)\s*:?\s*([A-Z0-9\-/]+)/i, /Unsere Bestellung\s*:?\s*([A-Z0-9\-/]+)/i]);
  const orderDate = heinzBerger?.orderDate ?? toIsoDate(findFirst(text, [/Bestellung\s+\d+\s+vom\s+(\d{1,2}\.\d{1,2}\.\d{2,4})/i, /Bestelldatum\s*:?\s*(\d{1,2}\.\d{1,2}\.\d{2,4})/i, /Datum\s*:?\s*(\d{1,2}\.\d{1,2}\.\d{2,4})/i]));
  const deliveryDeadline = heinzBerger?.deliveryDeadline ?? toIsoDate(findFirst(text, [/Liefertermin\s*:?\s*(\d{1,2}\.\d{1,2}\.\d{2,4})/i, /Lieferdatum\s*:?\s*(\d{1,2}\.\d{1,2}\.\d{2,4})/i]));
  const positions = heinzBerger?.positions.length ? heinzBerger.positions : mergeDuplicatePositions(extractLinePositions(text));

  return { customer_name: extractCustomer(text), order_number: orderNumber || `PDF-${Date.now()}`, order_date: orderDate, delivery_deadline: deliveryDeadline, positions };
}
