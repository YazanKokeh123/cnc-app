import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, FileText, Save, Send } from "lucide-react";
import { saveOrderFields, savePositionFields } from "@/app/actions";
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

        <form action={saveOrderFields} className="rounded border border-slate-200 bg-white p-5 shadow-panel">
          <input type="hidden" name="order_id" value={order.id} />
          <h2 className="text-base font-semibold text-graphite">Versand und Zahlung</h2>
          <label className="mt-4 flex items-center gap-3 text-sm font-medium text-graphite"><input type="checkbox" name="delivered" defaultChecked={order.delivered} className="h-4 w-4" />Geliefert / gesendet</label>
          <label className="mt-3 block text-sm text-steel">Versanddatum<input type="date" name="sent_date" defaultValue={order.sent_date ?? ""} className="mt-1 h-10 w-full rounded border border-slate-300 px-3 text-graphite" /></label>
          <label className="mt-4 flex items-center gap-3 text-sm font-medium text-graphite"><input type="checkbox" name="paid" defaultChecked={order.paid} className="h-4 w-4" />Bezahlt</label>
          <label className="mt-3 block text-sm text-steel">Zahlungsdatum<input type="date" name="paid_date" defaultValue={order.paid_date ?? ""} className="mt-1 h-10 w-full rounded border border-slate-300 px-3 text-graphite" /></label>
          <button className="mt-5 inline-flex h-10 items-center gap-2 rounded bg-signal px-3 text-sm font-semibold text-white hover:bg-orange-700"><Send size={16} />Speichern</button>
        </form>
      </section>

      <section className="overflow-x-auto rounded border border-slate-200 bg-white shadow-panel">
        <div className="min-w-[1120px]">
          <div className="grid grid-cols-[90px_130px_1fr_180px_150px_220px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-steel"><span>Pos</span><span>Menge</span><span>Beschreibung</span><span>Zeichnung</span><span>Preis</span><span>Status</span></div>
          {positions.map((position) => (
            <form key={position.id} action={savePositionFields} className="grid grid-cols-[90px_130px_1fr_180px_150px_220px] items-start gap-3 border-b border-slate-100 px-4 py-4 text-sm">
              <input type="hidden" name="order_id" value={order.id} />
              <input type="hidden" name="position_id" value={position.id} />
              <label className="block text-xs font-semibold uppercase tracking-wide text-steel">
                Pos
                <input name="pos_number" defaultValue={position.pos_number} className="mt-1 h-9 w-full rounded border border-slate-300 px-2 text-sm font-semibold normal-case tracking-normal text-graphite" />
              </label>
              <div className="grid grid-cols-[1fr_54px] gap-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-steel">
                  Menge
                  <input name="quantity" inputMode="decimal" defaultValue={formatNumberInput(position.quantity)} className="mt-1 h-9 w-full rounded border border-slate-300 px-2 text-sm normal-case tracking-normal text-graphite" />
                </label>
                <label className="block text-xs font-semibold uppercase tracking-wide text-steel">
                  EH
                  <input name="unit" defaultValue={position.unit} className="mt-1 h-9 w-full rounded border border-slate-300 px-2 text-sm normal-case tracking-normal text-graphite" />
                </label>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-steel">
                  Beschreibung
                  <textarea name="description" defaultValue={position.description} rows={2} className="mt-1 w-full resize-y rounded border border-slate-300 px-2 py-2 text-sm font-medium normal-case tracking-normal text-graphite" />
                </label>
                <label className="block text-xs font-semibold uppercase tracking-wide text-steel">
                  Einzelpreis
                  <input name="unit_price" inputMode="decimal" defaultValue={formatNumberInput(position.unit_price)} className="mt-1 h-9 w-36 rounded border border-slate-300 px-2 text-sm normal-case tracking-normal text-graphite" />
                </label>
              </div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-steel">
                Zeichnung
                <input name="drawing_number" defaultValue={position.drawing_number ?? ""} className="mt-1 h-9 w-full rounded border border-slate-300 px-2 text-sm normal-case tracking-normal text-graphite" />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wide text-steel">
                Preis
                <input name="total_price" inputMode="decimal" defaultValue={formatNumberInput(position.total_price)} className="mt-1 h-9 w-full rounded border border-slate-300 px-2 text-sm normal-case tracking-normal text-graphite" />
              </label>
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-24">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-steel">Status</span>
                  <StatusBadge status={position.status} />
                </div>
                <select name="status" defaultValue={position.status} className="h-9 rounded border border-slate-300 bg-white px-2 text-sm">
                  {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <button className="inline-flex h-9 items-center gap-2 rounded border border-slate-300 px-3 text-xs font-semibold text-graphite hover:bg-slate-50"><Save size={14} />OK</button>
              </div>
            </form>
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

function formatNumberInput(value: number | null) {
  return value == null ? "" : String(value);
}
