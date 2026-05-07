import type { Order, OrderPosition, ParsedOrder, PositionStatus } from "@/lib/types";
import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase/server";

const positionStatuses: PositionStatus[] = ["open", "in_progress", "done"];

export async function listOrders(): Promise<Order[]> {
  if (!hasSupabaseConfig()) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, positions:order_positions(*)")
    .order("delivery_deadline", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return (data ?? []).map(sortOrderPositions);
}

export async function getOrder(id: string): Promise<Order | null> {
  if (!hasSupabaseConfig()) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, positions:order_positions(*)")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return sortOrderPositions(data);
}

export async function createOrderFromParsed(parsed: ParsedOrder, sourcePdfPath: string | null) {
  const supabase = await createSupabaseServerClient();
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      customer_name: parsed.customer_name,
      order_number: parsed.order_number,
      order_date: parsed.order_date,
      delivery_deadline: parsed.delivery_deadline,
      source_pdf_path: sourcePdfPath
    })
    .select()
    .single();

  if (orderError) throw orderError;

  if (parsed.positions.length) {
    const rows = parsed.positions.map((position) => ({
      ...position,
      order_id: order.id,
      status: "open" as const
    }));
    const { error } = await supabase.from("order_positions").insert(rows);
    if (error) throw error;
  }

  return order as Order;
}

export async function createPositionFromFields(orderId: string, formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const quantity = parseNumber(formData.get("quantity")) ?? 1;
  const unitPrice = parseNumber(formData.get("unit_price"));
  const totalPrice = parseNumber(formData.get("total_price")) ?? (unitPrice == null ? null : Number((unitPrice * quantity).toFixed(2)));
  const status = parsePositionStatus(formData.get("status"));

  const { error } = await supabase.from("order_positions").insert({
    order_id: orderId,
    pos_number: cleanText(formData.get("pos_number")) || nextManualPositionNumber(),
    quantity,
    unit: cleanText(formData.get("unit")) || "ST",
    description: cleanText(formData.get("description")) || "Neue Position",
    drawing_number: cleanText(formData.get("drawing_number")) || null,
    unit_price: unitPrice,
    total_price: totalPrice,
    status
  });

  if (error) throw error;
}

export async function updateOrderFields(id: string, formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const delivered = formData.get("delivered") === "on";
  const paid = formData.get("paid") === "on";
  const sentDate = String(formData.get("sent_date") || "") || null;
  const paidDate = String(formData.get("paid_date") || "") || null;

  const { error } = await supabase
    .from("orders")
    .update({
      delivered,
      paid,
      sent_date: delivered ? sentDate : null,
      paid_date: paid ? paidDate : null
    })
    .eq("id", id);

  if (error) throw error;
}

export async function updatePositionFields(id: string, formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const status = parsePositionStatus(formData.get("status"));

  const { error } = await supabase
    .from("order_positions")
    .update({
      pos_number: cleanText(formData.get("pos_number")),
      quantity: parseNumber(formData.get("quantity")) ?? 0,
      unit: cleanText(formData.get("unit")) || "ST",
      description: cleanText(formData.get("description")),
      drawing_number: cleanText(formData.get("drawing_number")) || null,
      unit_price: parseNumber(formData.get("unit_price")),
      total_price: parseNumber(formData.get("total_price")),
      status
    })
    .eq("id", id);

  if (error) throw error;
}

export async function updatePositionStatus(id: string, status: OrderPosition["status"]) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("order_positions").update({ status }).eq("id", id);
  if (error) throw error;
}

function cleanText(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

function parsePositionStatus(value: FormDataEntryValue | null): PositionStatus {
  const status = String(value || "open") as PositionStatus;
  return positionStatuses.includes(status) ? status : "open";
}

function parseNumber(value: FormDataEntryValue | null) {
  const raw = String(value || "").trim().replace(/\s/g, "");
  if (!raw) return null;

  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const number = Number.parseFloat(normalized.replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? number : null;
}

function nextManualPositionNumber() {
  return "999";
}

function sortOrderPositions(order: Order): Order {
  return {
    ...order,
    positions: [...(order.positions ?? [])].sort(comparePositions)
  };
}

function comparePositions(left: OrderPosition, right: OrderPosition) {
  return firstPositionNumber(left.pos_number) - firstPositionNumber(right.pos_number) || left.pos_number.localeCompare(right.pos_number);
}

function firstPositionNumber(value: string) {
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
}
