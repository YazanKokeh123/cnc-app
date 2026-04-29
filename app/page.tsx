import Link from "next/link";
import type React from "react";
import { AlertTriangle, CheckCircle2, Clock, Euro, PackageCheck } from "lucide-react";
import { formatDate, isDeadlineWarning } from "@/lib/date";
import { formatCurrency } from "@/lib/money";
import { listOrders } from "@/lib/orders";
import { StatusBadge } from "@/components/status-badge";

export default async function DashboardPage() {
  const orders = await listOrders();
  const openOrders = orders.filter((order) => !order.delivered).length;
  const dueSoon = orders.filter((order) => isDeadlineWarning(order.delivery_deadline) && !order.delivered).length;
  const unpaid = orders.filter((order) => !order.paid).length;
  const value = orders.reduce(
    (sum, order) => sum + (order.positions ?? []).reduce((inner, position) => inner + (position.total_price ?? 0), 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold text-graphite">Auftraege</h1>
          <p className="mt-2 text-sm text-steel">Ueberblick fuer Fertigung, Lieferung und Zahlung.</p>
        </div>
        <Link
          href="/orders/new"
          className="inline-flex h-11 items-center justify-center rounded bg-signal px-4 text-sm font-semibold text-white hover:bg-orange-700"
        >
          Bestellung PDF hochladen
        </Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={<Clock size={19} />} label="Offene Auftraege" value={openOrders.toString()} />
        <Metric icon={<AlertTriangle size={19} />} label="Faellig in 7 Tagen" value={dueSoon.toString()} accent />
        <Metric icon={<PackageCheck size={19} />} label="Nicht bezahlt" value={unpaid.toString()} />
        <Metric icon={<Euro size={19} />} label="Auftragswert" value={formatCurrency(value)} />
      </section>

      <section className="overflow-x-auto rounded border border-slate-200 bg-white shadow-panel">
        <div className="min-w-[860px]">
          <div className="grid grid-cols-[1fr_150px_150px_130px_120px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-steel">
            <span>Kunde / Bestellung</span>
            <span>Bestelldatum</span>
            <span>Liefertermin</span>
            <span>Status</span>
            <span>Zahlung</span>
          </div>
          {orders.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-steel">
              Noch keine Auftraege vorhanden. Lade die erste Bestellung als PDF hoch.
            </div>
          ) : (
            orders.map((order) => {
              const positions = order.positions ?? [];
              const done = positions.filter((position) => position.status === "done").length;
              const firstOpen = positions.find((position) => position.status !== "done")?.status ?? "done";
              return (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="grid grid-cols-[1fr_150px_150px_130px_120px] items-center border-b border-slate-100 px-4 py-4 text-sm hover:bg-slate-50"
                >
                  <span>
                    <span className="block font-semibold text-graphite">{order.customer_name}</span>
                    <span className="text-steel">Bestellung {order.order_number}</span>
                  </span>
                  <span>{formatDate(order.order_date)}</span>
                  <span className={isDeadlineWarning(order.delivery_deadline) && !order.delivered ? "font-semibold text-signal" : ""}>
                    {formatDate(order.delivery_deadline)}
                  </span>
                  <span className="flex items-center gap-2">
                    <StatusBadge status={firstOpen} />
                    <span className="text-xs text-steel">
                      {done}/{positions.length}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-2">
                    {order.paid ? <CheckCircle2 size={17} className="text-emerald-600" /> : <Euro size={17} className="text-slate-400" />}
                    {order.paid ? "Bezahlt" : "Offen"}
                  </span>
                </Link>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  accent = false
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4 shadow-panel">
      <div className={accent ? "text-signal" : "text-steel"}>{icon}</div>
      <div className="mt-4 text-2xl font-semibold text-graphite">{value}</div>
      <div className="mt-1 text-sm text-steel">{label}</div>
    </div>
  );
}
