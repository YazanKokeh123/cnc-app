create extension if not exists "pgcrypto";

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  order_number text not null,
  order_date date,
  delivery_deadline date,
  delivered boolean not null default false,
  sent_date date,
  paid boolean not null default false,
  paid_date date,
  source_pdf_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.order_positions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  pos_number text not null,
  quantity numeric not null default 0,
  unit text not null default 'Stk',
  description text not null,
  drawing_number text,
  unit_price numeric,
  total_price numeric,
  status text not null default 'open' check (status in ('open', 'in_progress', 'done')),
  created_at timestamptz not null default now()
);

create index if not exists order_positions_order_id_idx on public.order_positions(order_id);
create index if not exists orders_delivery_deadline_idx on public.orders(delivery_deadline);
create unique index if not exists orders_order_number_idx on public.orders(order_number);

alter table public.orders enable row level security;
alter table public.order_positions enable row level security;

create policy "Authenticated users can manage orders"
  on public.orders for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can manage positions"
  on public.order_positions for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

insert into storage.buckets (id, name, public)
values ('order-pdfs', 'order-pdfs', false)
on conflict (id) do nothing;
