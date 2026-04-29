import type { Order, OrderPosition, ParsedOrder } from "@/lib/types";
import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase/server";

export async function listOrders(): Promise<Order[]> {
  if (!hasSupabaseConfig()) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, positions:order_positions(*)")
    .order("delivery_deadline", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return data ?? [];
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

  return data;
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

export async function updatePositionStatus(id: string, status: OrderPosition["status"]) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("order_positions").update({ status }).eq("id", id);
  if (error) throw error;
}
