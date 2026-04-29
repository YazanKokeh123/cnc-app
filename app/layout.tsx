import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { ClipboardList, LogIn, Upload } from "lucide-react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CNC Auftragsverwaltung",
  description: "Auftragsmanagement fuer CNC Werkstaetten"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body className={inter.className}>
        <div className="min-h-screen">
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
              <Link href="/" className="flex items-center gap-3 text-lg font-semibold text-graphite">
                <span className="flex h-10 w-10 items-center justify-center rounded bg-graphite text-white">
                  CNC
                </span>
                Auftragsverwaltung
              </Link>
              <nav className="flex items-center gap-2">
                <Link
                  href="/"
                  className="inline-flex h-10 items-center gap-2 rounded border border-slate-200 bg-white px-3 text-sm font-medium text-graphite shadow-panel hover:bg-slate-50"
                >
                  <ClipboardList size={17} />
                  Auftraege
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-10 items-center gap-2 rounded border border-slate-200 bg-white px-3 text-sm font-medium text-graphite shadow-panel hover:bg-slate-50"
                >
                  <LogIn size={17} />
                  Login
                </Link>
                <Link
                  href="/orders/new"
                  className="inline-flex h-10 items-center gap-2 rounded bg-signal px-3 text-sm font-medium text-white shadow-panel hover:bg-orange-700"
                >
                  <Upload size={17} />
                  PDF hochladen
                </Link>
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
