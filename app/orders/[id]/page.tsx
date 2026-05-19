import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentActions } from "@/components/document-actions";
import { OrderFieldsForm } from "@/components/order-fields-form";
import { PositionTable } from "@/components/position-table";
import { formatDate, isDeadlineWarning } from "@/lib/date";
import { formatCurrency } from "@/lib/money";
import { getOrder } from "@/lib/orders";

type Props = { params: Promise<{ id: string }> };

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;

  try {
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
          <DocumentActions orderId={order.id} orderNumber={order.order_number} />
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
  } catch (error) {
    return <LoadError error={error} />;
  }
}

function LoadError({ error }: { error: unknown }) {
  return (
    <div className="rounded border border-red-200 bg-red-50 p-5 text-sm text-red-900">
      <Link href="/" className="text-sm font-medium text-red-800 underline">Zurueck zur Uebersicht</Link>
      <h1 className="mt-3 text-lg font-semibold">Auftrag konnte nicht geladen werden</h1>
      <p className="mt-2 font-medium">{readErrorMessage(error)}</p>
      <p className="mt-3 text-red-800">Bitte sende diese Meldung, falls der Fehler bleibt.</p>
    </div>
  );
}

function readErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) return String(error.message);
  return JSON.stringify(error);
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-steel">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-graphite">{value}</dd>
    </div>
  );
}
