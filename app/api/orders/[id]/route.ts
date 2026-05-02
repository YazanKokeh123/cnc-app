import { NextResponse } from "next/server";
import { updateOrderFields } from "@/lib/orders";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const formData = new FormData();

  if (body.delivered) formData.set("delivered", "on");
  if (body.paid) formData.set("paid", "on");
  formData.set("sent_date", body.sent_date ?? "");
  formData.set("paid_date", body.paid_date ?? "");

  await updateOrderFields(id, formData);
  return NextResponse.json({ ok: true });
}
