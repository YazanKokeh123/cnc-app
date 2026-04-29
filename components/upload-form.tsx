"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";

export function UploadForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/orders/upload", {
      method: "POST",
      body: formData
    });
    const payload = await response.json();
    setBusy(false);

    if (!response.ok) {
      setError(payload.error ?? "PDF konnte nicht verarbeitet werden.");
      return;
    }

    router.push(`/orders/${payload.orderId}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-5">
      <label className="flex min-h-64 cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed border-slate-300 bg-white px-6 text-center shadow-panel hover:border-signal">
        <UploadCloud size={42} className="mb-4 text-steel" />
        <span className="text-base font-semibold text-graphite">Bestellung als PDF auswaehlen</span>
        <span className="mt-2 text-sm text-steel">Zielparser: Heinz Berger Maschinenfabrik GmbH & Co. KG</span>
        <input required type="file" name="file" accept="application/pdf" className="mt-6 block w-full max-w-sm text-sm" />
      </label>
      {error ? <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex h-11 items-center gap-2 rounded bg-graphite px-4 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
      >
        <UploadCloud size={18} />
        {busy ? "Wird verarbeitet..." : "PDF hochladen und Auftrag anlegen"}
      </button>
    </form>
  );
}
