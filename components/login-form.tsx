"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LoginForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="max-w-sm rounded border border-slate-200 bg-white p-5 shadow-panel">
      <label className="block text-sm font-medium text-graphite">
        E-Mail
        <input required type="email" name="email" className="mt-1 h-10 w-full rounded border border-slate-300 px-3" />
      </label>
      <label className="mt-4 block text-sm font-medium text-graphite">
        Passwort
        <input required type="password" name="password" className="mt-1 h-10 w-full rounded border border-slate-300 px-3" />
      </label>
      {message ? <p className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p> : null}
      <button
        disabled={busy}
        className="mt-5 inline-flex h-10 items-center gap-2 rounded bg-graphite px-3 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
      >
        <LogIn size={17} />
        {busy ? "Anmeldung..." : "Anmelden"}
      </button>
    </form>
  );
}
