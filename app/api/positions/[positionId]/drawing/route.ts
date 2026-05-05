import { NextResponse } from "next/server";
import { extractDrawingPagePdf } from "@/lib/pdf/drawing-pages";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ positionId: string }> };

type PositionRow = {
  drawing_number: string | null;
  order_id: string;
};

type OrderRow = {
  source_pdf_path: string | null;
};

export async function GET(_request: Request, { params }: Params) {
  const { positionId } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: position, error: positionError } = await supabase
    .from("order_positions")
    .select("drawing_number, order_id")
    .eq("id", positionId)
    .single<PositionRow>();

  if (positionError || !position) return NextResponse.json({ error: "Position nicht gefunden." }, { status: 404 });
  if (!position.drawing_number) return NextResponse.json({ error: "Keine Zeichnungsnummer vorhanden." }, { status: 404 });

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("source_pdf_path")
    .eq("id", position.order_id)
    .single<OrderRow>();

  if (orderError || !order?.source_pdf_path) return NextResponse.json({ error: "Original-PDF nicht gespeichert." }, { status: 404 });

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
