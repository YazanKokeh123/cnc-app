"use server";

import { revalidatePath } from "next/cache";
import { updateOrderFields, updatePositionFields } from "@/lib/orders";

export async function saveOrderFields(formData: FormData) {
  const orderId = String(formData.get("order_id") || "");
  if (!orderId) return;

  await updateOrderFields(orderId, formData);
  revalidatePath("/");
  revalidatePath(`/orders/${orderId}`);
}

export async function savePositionFields(formData: FormData) {
  const orderId = String(formData.get("order_id") || "");
  const positionId = String(formData.get("position_id") || "");
  if (!orderId || !positionId) return;

  await updatePositionFields(positionId, formData);
  revalidatePath("/");
  revalidatePath(`/orders/${orderId}`);
}
