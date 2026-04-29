import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, FileText, Send } from "lucide-react";
import { saveOrderFields, savePositionStatus } from "@/app/actions";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, isDeadlineWarning } from "@/lib/date";
import { formatCurrency } from "@/lib/money";
import { getOrder } from "@/lib/orders";
import type { PositionStatus } from "@/lib/types";

type Props = { params: Promise<{ id: string }> };

const statusOptions: Array<{ value: PositionStatus; label: string }> = [
  { value: "open", label: "Offen" },
  { value: "in_progress", label: "In Arbeit" },
  { value: "done", label: "Fertig" }
];

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

        <form action={saveOrderFields.bind(null, order.id)} className="rounded border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="text-base font-semibold text-graphite">Versand und Zahlung</h2>
          <label className="mt-4 flex items-center gap-3 text-sm font-medium text-graphite"><input type="checkbox" name="delivered" defaultChecked={order.delivered} className="h-4 w-4" />Geliefert / gesendet</label>
          <label className="mt-3 block text-sm text-steel">Versanddatum<input type="date" name="sent_date" defaultValue={order.sent_date ?? ""} className="mt-1 h-10 w-full rounded border border-slate-300 px-3 text-graphite" /></label>
          <label className="mt-4 flex items-center gap-3 text-sm font-medium text-graphite"><input type="checkbox" name="paid" defaultChecked={order.paid} className="h-4 w-4" />Bezahlt</label>
          <label className="mt-3 block text-sm text-steel">Zahlungsdatum<input type="date" name="paid_date" defaultValue={order.paid_date ?? ""} className="mt-1 h-10 w-full rounded border border-slate-300 px-3 text-graphite" /></label>
          <button className="mt-5 inline-flex h-10 items-center gap-2 rounded bg-signal px-3 text-sm font-semibold text-white hover:bg-orange-700"><Send size={16} />Speichern</button>
        </form>
      </section>

      <section className="overflow-x-auto rounded border border-slate-200 bg-white shadow-panel">
        <div className="min-w-[980px]">
          <div className="grid grid-cols-[70px_100px_1fr_150px_120px_150px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-steel"><span>Pos</span><span>Menge</span><span>Beschreibung</span><span>Zeichnung</span><span>Preis</span><span>Status</span></div>
          {positions.map((position) => (
            <div key={position.id} className="grid grid-cols-[70px_100px_1fr_150px_120px_150px] items-center border-b border-slate-100 px-4 py-4 text-sm">
              <span className="font-semibold text-graphite">{position.pos_number}</span>
              <span>{position.quantity} {position.unit}</span>
              <span><span className="block font-medium text-graphite">{position.description}</span><span className="text-steel">EP {formatCurrency(position.unit_price)}</span></span>
              <span>{position.drawing_number ?? "-"}</span>
              <span>{formatCurrency(position.total_price)}</span>
              <form action={savePositionStatus.bind(null, order.id, position.id)} className="flex items-center gap-2">
                <StatusBadge status={position.status} />
                <select name="status" defaultValue={position.status} className="h-9 rounded border border-slate-300 bg-white px-2 text-sm">
                  {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <button className="h-9 rounded border border-slate-300 px-2 text-xs font-semibold text-graphite hover:bg-slate-50">OK</button>
              </form>
            </div>
          ))}
        </div>
      </section>
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
