import { NextResponse, type NextRequest } from "next/server";
import { getOrder } from "@/lib/orders";
import { parseGermanMoney } from "@/lib/money";
import { generateOrderDocument } from "@/lib/pdf/documents";

type Params = {
  params: Promise<{ id: string; kind: string }>;
};

type DocumentKind = "rechnung" | "lieferschein";

function isDocumentKind(kind: string): kind is DocumentKind {
  return kind === "rechnung" || kind === "lieferschein";
}

export async function GET(request: NextRequest, { params }: Params): Promise<Response> {
  const { id, kind } = await params;
  if (!isDocumentKind(kind)) {
    return NextResponse.json({ error: "Unbekannter Dokumenttyp." }, { status: 400 });
  }

  const order = await getOrder(id);
  if (!order) return NextResponse.json({ error: "Auftrag nicht gefunden." }, { status: 404 });

  const documentNumber = request.nextUrl.searchParams.get("number") || undefined;
  const shippingCost = kind === "rechnung" ? parseGermanMoney(request.nextUrl.searchParams.get("versand") || "") : null;
  const bytes = await generateOrderDocument(order, kind, { documentNumber, shippingCost });
  const filenameNumber = documentNumber || order.order_number;
  const filename = `${kind}-${filenameNumber}.pdf`;

  return new Response(Buffer.from(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${filename}"`
    }
  });
}
