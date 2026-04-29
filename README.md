# CNC Order Manager

Next.js App Router web app for CNC workshop order handling.

## Features

- German order dashboard with deadline warnings
- Bestellung PDF upload and parsing, initially tuned for Heinz Berger Maschinenfabrik GmbH & Co. KG order PDFs
- Supabase database and auth-ready data layer
- Order detail page with position status tracking
- Delivered/sent and paid fields
- Rechnung and Lieferschein PDF generation

## Setup

1. Install dependencies with `npm install`.
2. Create a Supabase project.
3. Run `supabase/schema.sql` in the Supabase SQL editor.
4. Copy `.env.example` to `.env.local` and fill in the Supabase values.
5. Start the app with `npm run dev`.

The upload endpoint stores the original PDF in the `order-pdfs` bucket when the bucket exists. The database rows are still created if storage upload fails.
