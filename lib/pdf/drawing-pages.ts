import pdfParse from "pdf-parse";
import { PDFDocument } from "pdf-lib";

function normalizeDrawingLookup(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function getPdfPageTexts(buffer: Buffer) {
  const pages: string[] = [];

  await pdfParse(buffer, {
    pagerender: async (pageData: { getTextContent: () => Promise<{ items: Array<{ str?: string }> }> }) => {
      const textContent = await pageData.getTextContent();
      const pageText = textContent.items.map((item) => item.str ?? "").join(" ");
      pages.push(pageText);
      return pageText;
    }
  } as Parameters<typeof pdfParse>[1]);

  return pages;
}

export async function extractDrawingPagePdf(buffer: Buffer, drawingNumber: string) {
  const lookup = normalizeDrawingLookup(drawingNumber);
  if (!lookup) return null;

  const pageTexts = await getPdfPageTexts(buffer);
  const matchingIndexes = pageTexts
    .map((text, index) => ({ text: normalizeDrawingLookup(text), index }))
    .filter((page) => page.text.includes(lookup))
    .map((page) => page.index);

  if (!matchingIndexes.length) return null;

  // The order table contains drawing numbers too. The actual drawing sheets are later in the PDF.
  const pageIndex = matchingIndexes[matchingIndexes.length - 1];
  const sourcePdf = await PDFDocument.load(buffer);
  const drawingPdf = await PDFDocument.create();
  const [page] = await drawingPdf.copyPages(sourcePdf, [pageIndex]);
  drawingPdf.addPage(page);

  return Buffer.from(await drawingPdf.save());
}
