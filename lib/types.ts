export type PositionStatus = "open" | "in_progress" | "done";

export type OrderPosition = {
  id: string;
  order_id: string;
  pos_number: string;
  quantity: number;
  unit: string;
  description: string;
  drawing_number: string | null;
  unit_price: number | null;
  total_price: number | null;
  status: PositionStatus;
  created_at?: string;
};

export type Order = {
  id: string;
  customer_name: string;
  order_number: string;
  order_date: string | null;
  delivery_deadline: string | null;
  delivered: boolean;
  sent_date: string | null;
  paid: boolean;
  paid_date: string | null;
  source_pdf_path: string | null;
  created_at: string;
  positions?: OrderPosition[];
};

export type ParsedOrderPosition = Omit<OrderPosition, "id" | "order_id" | "status" | "created_at">;

export type ParsedOrder = {
  customer_name: string;
  order_number: string;
  order_date: string | null;
  delivery_deadline: string | null;
  positions: ParsedOrderPosition[];
};
