alter table public.store_order_items
  add column if not exists created_at timestamptz not null default now();

notify pgrst, 'reload schema';
