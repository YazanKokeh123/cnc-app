"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { updateOrderFields, updatePositionStatus } from "@/lib/orders";
import type { PositionStatus } from "@/lib/types";

export async function saveOrderFields(orderId: string, formData: FormData) {
  await updateOrderFields(orderId, formData);
  revalidatePath("/");
  revalidatePath(`/orders/${orderId}`);
}

export async function savePositionStatus(orderId: string, positionId: string, formData: FormData) {
  const status = String(formData.get("status")) as PositionStatus;
  if (!["open", "in_progress", "done"].includes(status)) return;
  await updatePositionStatus(positionId, status);
  revalidatePath("/");
  revalidatePath(`/orders/${orderId}`);
}

export async function goToOrder(orderId: string) {
  redirect(`/orders/${orderId}`);
}
