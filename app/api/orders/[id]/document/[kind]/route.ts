import { NextResponse } from "next/server";
import { getOrder } from "@/lib/orders";
import { generateOrderDocument } from "@/lib/pdf/documents";

type Params = {
  params: Promise<{ id: string; kind: "rechnung" | "lieferschein" }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { id, kind } = await params;
  if (!["rechnung", "lieferschein"].includes(kind)) {
    return NextResponse.json({ error: "Unbekannter Dokumenttyp." }, { status: 400 });
  }

  const order = await getOrder(id);
  if (!order) return NextResponse.json({ error: "Auftrag nicht gefunden." }, { status: 404 });

  const bytes = await generateOrderDocument(order, kind);
  const filename = `${kind}-${order.order_number}.pdf`;

  return new NextResponse(bytes, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${filename}"`
    }
  });
}
