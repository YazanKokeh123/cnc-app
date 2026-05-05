"use client";

import { useRouter } from "next/navigation";
import { Fragment, useState, useTransition } from "react";
import { Check, ChevronDown, ChevronUp, Pencil, X } from "lucide-react";
import clsx from "clsx";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency } from "@/lib/money";
import type { OrderPosition, PositionStatus } from "@/lib/types";

const statusOptions: Array<{ value: PositionStatus; label: string }> = [
  { value: "open", label: "Offen" },
  { value: "in_progress", label: "In Arbeit" },
  { value: "done", label: "Fertig" }
];

export function PositionTable({ orderId, positions }: { orderId: string; positions: OrderPosition[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drawingId, setDrawingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function savePosition(positionId: string, formData: FormData) {
    setSavingId(positionId);
    setErrorId(null);

    const response = await fetch(`/api/orders/${orderId}/positions/${positionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData))
    });

    setSavingId(null);

    if (!response.ok) {
      setErrorId(positionId);
      return;
    }

    setEditingId(null);
    startTransition(() => router.refresh());
  }

  return (
    <section className="overflow-x-auto rounded border border-slate-200 bg-white shadow-panel">
      <div className="min-w-[1080px]">
        <div className="grid grid-cols-[70px_100px_1fr_170px_130px_210px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-steel"><span>Pos</span><span>Menge</span><span>Beschreibung</span><span>Zeichnung</span><span>Preis</span><span>Status</span></div>
        {positions.map((position) => (
          <Fragment key={position.id}>
            {editingId === position.id ? (
              <form action={(formData) => savePosition(position.id, formData)} className="grid grid-cols-[70px_130px_1fr_170px_130px_230px] items-start gap-3 border-b border-slate-100 px-4 py-4 text-sm">
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
                  <label className="block text-xs font-semibold uppercase tracking-wide text-steel">
                    Status
                    <select name="status" defaultValue={position.status} className="mt-1 h-9 rounded border border-slate-300 bg-white px-2 text-sm normal-case tracking-normal text-graphite">
                      {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <button disabled={savingId === position.id || isPending} className="inline-flex h-9 items-center gap-2 rounded bg-signal px-3 text-xs font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"><Check size={14} />OK</button>
                  <button type="button" onClick={() => setEditingId(null)} className="inline-flex h-9 items-center gap-2 rounded border border-slate-300 px-3 text-xs font-semibold text-graphite hover:bg-slate-50"><X size={14} />Abbrechen</button>
                  {errorId === position.id ? <p className="basis-full text-xs font-medium text-red-700">Speichern fehlgeschlagen.</p> : null}
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-[70px_100px_1fr_170px_130px_210px] items-center border-b border-slate-100 px-4 py-4 text-sm">
                <span className={clsx("font-semibold", isFinishingPosition(position) ? "text-emerald-700" : "text-graphite")}>{position.pos_number}</span>
                <span>{position.quantity} {position.unit}</span>
                <span><span className="block font-medium text-graphite">{position.description}</span><span className="text-steel">EP {formatCurrency(position.unit_price)}</span></span>
                <span className="flex items-center gap-2">
                  {position.drawing_number ?? "-"}
                  {position.drawing_number ? (
                    <button type="button" onClick={() => setDrawingId(drawingId === position.id ? null : position.id)} title="Zeichnung anzeigen" className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-300 text-graphite hover:bg-slate-50">
                      {drawingId === position.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  ) : null}
                </span>
                <span>{formatCurrency(position.total_price)}</span>
                <span className="flex items-center gap-2">
                  <StatusBadge status={position.status} />
                  <button type="button" onClick={() => setEditingId(position.id)} title="Position bearbeiten" className="inline-flex h-9 w-9 items-center justify-center rounded border border-slate-300 text-graphite hover:bg-slate-50">
                    <Pencil size={15} />
                  </button>
                </span>
              </div>
            )}
            {drawingId === position.id ? (
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-4">
                <div className="rounded border border-slate-200 bg-white p-3">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-steel">Zeichnung {position.drawing_number}</div>
                  <iframe title={`Zeichnung ${position.drawing_number}`} src={`/api/positions/${position.id}/drawing`} className="h-[680px] w-full rounded border border-slate-200 bg-white" />
                </div>
              </div>
            ) : null}
          </Fragment>
        ))}
      </div>
    </section>
  );
}

function formatNumberInput(value: number | null) {
  return value == null ? "" : String(value);
}

function isFinishingPosition(position: OrderPosition) {
  return /vernickeln|br[uü]hnieren/i.test(position.description);
}
