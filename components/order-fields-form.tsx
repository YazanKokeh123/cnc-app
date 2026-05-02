"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import type { Order } from "@/lib/types";

export function OrderFieldsForm({ order }: { order: Order }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function onSubmit(formData: FormData) {
    setError(null);

    const response = await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        delivered: formData.get("delivered") === "on",
        sent_date: formData.get("sent_date") || "",
        paid: formData.get("paid") === "on",
        paid_date: formData.get("paid_date") || ""
      })
    });

    if (!response.ok) {
      setError("Speichern fehlgeschlagen.");
      return;
    }

    startTransition(() => router.refresh());
  }

  return (
    <form action={onSubmit} className="rounded border border-slate-200 bg-white p-5 shadow-panel">
      <h2 className="text-base font-semibold text-graphite">Versand und Zahlung</h2>
      <label className="mt-4 flex items-center gap-3 text-sm font-medium text-graphite"><input type="checkbox" name="delivered" defaultChecked={order.delivered} className="h-4 w-4" />Geliefert / gesendet</label>
      <label className="mt-3 block text-sm text-steel">Versanddatum<input type="date" name="sent_date" defaultValue={order.sent_date ?? ""} className="mt-1 h-10 w-full rounded border border-slate-300 px-3 text-graphite" /></label>
      <label className="mt-4 flex items-center gap-3 text-sm font-medium text-graphite"><input type="checkbox" name="paid" defaultChecked={order.paid} className="h-4 w-4" />Bezahlt</label>
      <label className="mt-3 block text-sm text-steel">Zahlungsdatum<input type="date" name="paid_date" defaultValue={order.paid_date ?? ""} className="mt-1 h-10 w-full rounded border border-slate-300 px-3 text-graphite" /></label>
      {error ? <p className="mt-3 text-sm font-medium text-red-700">{error}</p> : null}
      <button disabled={isPending} className="mt-5 inline-flex h-10 items-center gap-2 rounded bg-signal px-3 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"><Send size={16} />Speichern</button>
    </form>
  );
}
