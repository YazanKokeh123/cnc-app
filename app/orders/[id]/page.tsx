import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, FileText } from "lucide-react";
import { OrderFieldsForm } from "@/components/order-fields-form";
import { PositionTable } from "@/components/position-table";
import { formatDate, isDeadlineWarning } from "@/lib/date";
import { formatCurrency } from "@/lib/money";
import { getOrder } from "@/lib/orders";

type Props = { params: Promise<{ id: string }> };

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  const positions = order.positions ?? [];
  const total = positions.reduce((sum, position) => sum + (position.total_price ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <Link href="/" className="text-sm font-medium text-steel hover:text-graphite">Zurueck zur Uebersicht</Link>
          <h1 className="mt-3 text-2xl font-semibold text-graphite">Bestellung {order.order_number}</h1>
          <p className="mt-1 text-sm text-steel">{order.customer_name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/orders/${order.id}/document/rechnung`} className="inline-flex h-10 items-center gap-2 rounded border border-slate-200 bg-white px-3 text-sm font-semibold text-graphite shadow-panel hover:bg-slate-50"><FileText size={17} />Rechnung</a>
          <a href={`/api/orders/${order.id}/document/lieferschein`} className="inline-flex h-10 items-center gap-2 rounded bg-graphite px-3 text-sm font-semibold text-white shadow-panel hover:bg-black"><Download size={17} />Lieferschein</a>
        </div>
      </div>

      {isDeadlineWarning(order.delivery_deadline) && !order.delivered ? (
        <div className="rounded border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-800">Liefertermin ist innerhalb der naechsten 7 Tage: {formatDate(order.delivery_deadline)}.</div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="rounded border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="text-base font-semibold text-graphite">Auftragsdaten</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <Info label="Bestelldatum" value={formatDate(order.order_date)} />
            <Info label="Liefertermin" value={formatDate(order.delivery_deadline)} />
            <Info label="Positionen" value={positions.length.toString()} />
            <Info label="Summe netto" value={formatCurrency(total)} />
          </dl>
        </div>

        <OrderFieldsForm order={order} />
      </section>

      <PositionTable orderId={order.id} positions={positions} />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-steel">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-graphite">{value}</dd>
    </div>
  );
}
