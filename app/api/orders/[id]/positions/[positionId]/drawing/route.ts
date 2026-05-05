import { NextResponse } from "next/server";
import { getOrder } from "@/lib/orders";
import { extractDrawingPagePdf } from "@/lib/pdf/drawing-pages";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string; positionId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id, positionId } = await params;
  const order = await getOrder(id);
  if (!order) return NextResponse.json({ error: "Auftrag nicht gefunden." }, { status: 404 });

  const position = order.positions?.find((item) => item.id === positionId);
  if (!position) return NextResponse.json({ error: "Position nicht gefunden." }, { status: 404 });
  if (!position.drawing_number) return NextResponse.json({ error: "Keine Zeichnungsnummer vorhanden." }, { status: 404 });
  if (!order.source_pdf_path) return NextResponse.json({ error: "Original-PDF nicht gespeichert." }, { status: 404 });

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage.from("order-pdfs").download(order.source_pdf_path);
  if (error || !data) return NextResponse.json({ error: "Original-PDF konnte nicht geladen werden." }, { status: 404 });

  const buffer = Buffer.from(await data.arrayBuffer());
  const drawingPdf = await extractDrawingPagePdf(buffer, position.drawing_number);
  if (!drawingPdf) return NextResponse.json({ error: "Zeichnung wurde im PDF nicht gefunden." }, { status: 404 });

  const filename = `zeichnung-${position.drawing_number}.pdf`;
  return new Response(drawingPdf, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${filename}"`
    }
  });
}
