import { NextResponse } from "next/server";
import { createPositionFromFields } from "@/lib/orders";

type Params = { params: Promise<{ id: string }> };

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

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const formData = new FormData();

  for (const field of editableFields) {
    formData.set(field, body[field] ?? "");
  }

  await createPositionFromFields(id, formData);
  return NextResponse.json({ ok: true });
}
