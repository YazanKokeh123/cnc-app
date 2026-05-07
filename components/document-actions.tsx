"use client";

import { useState } from "react";
import { Download, FileText, X } from "lucide-react";

type DocumentKind = "rechnung" | "lieferschein";

type DialogState = {
  kind: DocumentKind;
  documentNumber: string;
  shippingCost: string;
  addShipping: boolean;
} | null;

export function DocumentActions({ orderId, orderNumber }: { orderId: string; orderNumber: string }) {
  const [dialog, setDialog] = useState<DialogState>(null);

  function openDialog(kind: DocumentKind) {
    setDialog({
      kind,
      documentNumber: kind === "rechnung" ? `R-${orderNumber}` : `LS-${orderNumber}`,
      shippingCost: "",
      addShipping: false
    });
  }

  function downloadDocument() {
    if (!dialog) return;
    const params = new URLSearchParams();
    if (dialog.documentNumber.trim()) params.set("number", dialog.documentNumber.trim());
    if (dialog.kind === "rechnung" && dialog.addShipping && dialog.shippingCost.trim()) params.set("versand", dialog.shippingCost.trim());
    window.open(`/api/orders/${orderId}/document/${dialog.kind}?${params.toString()}`, "_blank", "noopener,noreferrer");
    setDialog(null);
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => openDialog("rechnung")} className="inline-flex h-10 items-center gap-2 rounded border border-slate-200 bg-white px-3 text-sm font-semibold text-graphite shadow-panel hover:bg-slate-50"><FileText size={17} />Rechnung</button>
        <button type="button" onClick={() => openDialog("lieferschein")} className="inline-flex h-10 items-center gap-2 rounded bg-graphite px-3 text-sm font-semibold text-white shadow-panel hover:bg-black"><Download size={17} />Lieferschein</button>
      </div>

      {dialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-md rounded border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold text-graphite">{dialog.kind === "rechnung" ? "Rechnung erstellen" : "Lieferschein erstellen"}</h2>
              <button type="button" onClick={() => setDialog(null)} className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-300 text-graphite hover:bg-slate-50"><X size={15} /></button>
            </div>
            <label className="mt-4 block text-sm font-medium text-steel">
              {dialog.kind === "rechnung" ? "Rechnungsnummer" : "Lieferscheinnummer"}
              <input value={dialog.documentNumber} onChange={(event) => setDialog({ ...dialog, documentNumber: event.target.value })} className="mt-1 h-10 w-full rounded border border-slate-300 px-3 text-graphite" />
            </label>
            {dialog.kind === "rechnung" ? (
              <div className="mt-4 space-y-3">
                <label className="flex items-center gap-3 text-sm font-medium text-graphite"><input type="checkbox" checked={dialog.addShipping} onChange={(event) => setDialog({ ...dialog, addShipping: event.target.checked })} className="h-4 w-4" />Versand hinzufuegen</label>
                {dialog.addShipping ? (
                  <label className="block text-sm font-medium text-steel">
                    Versandkosten netto
                    <input value={dialog.shippingCost} onChange={(event) => setDialog({ ...dialog, shippingCost: event.target.value })} inputMode="decimal" placeholder="z.B. 25,00" className="mt-1 h-10 w-full rounded border border-slate-300 px-3 text-graphite" />
                  </label>
                ) : null}
              </div>
            ) : null}
            <button type="button" onClick={downloadDocument} className="mt-5 inline-flex h-10 items-center gap-2 rounded bg-signal px-3 text-sm font-semibold text-white hover:bg-orange-700"><Download size={16} />PDF herunterladen</button>
          </div>
        </div>
      ) : null}
    </>
  );
}
