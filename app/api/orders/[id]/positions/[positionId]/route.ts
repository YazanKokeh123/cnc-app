import { NextResponse } from "next/server";
import { updatePositionFields } from "@/lib/orders";

type Params = { params: Promise<{ id: string; positionId: string }> };

const editableFields = [
  "pos_number",
  "quantity",
  "unit",
  "description",
  "drawing_number",
  "unit_price",
  "total_price",
  "status"
];

export async function PATCH(request: Request, { params }: Params) {
  const { positionId } = await params;
  const body = await request.json();
  const formData = new FormData();

  for (const field of editableFields) {
    formData.set(field, body[field] ?? "");
  }

  await updatePositionFields(positionId, formData);
  return NextResponse.json({ ok: true });
}
