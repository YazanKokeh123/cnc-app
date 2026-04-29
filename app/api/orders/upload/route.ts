import { NextResponse } from "next/server";
import { createOrderFromParsed } from "@/lib/orders";
import { parseOrderPdf } from "@/lib/pdf/parse-order";
import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ error: "Supabase ist noch nicht konfiguriert." }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Bitte eine Bestellung als PDF hochladen." }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const parsed = await parseOrderPdf(buffer);
  const supabase = await createSupabaseServerClient();
  const storagePath = `${parsed.order_number}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage.from("order-pdfs").upload(storagePath, buffer, {
    contentType: "application/pdf",
    upsert: false
  });

  const order = await createOrderFromParsed(parsed, uploadError ? null : storagePath);
  return NextResponse.json({ orderId: order.id, parsed });
}
