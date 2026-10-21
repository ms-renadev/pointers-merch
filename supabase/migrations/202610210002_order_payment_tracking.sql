alter table public.store_orders
  add column if not exists amount_paid numeric(10, 2) not null default 0;

alter table public.store_orders
  drop constraint if exists store_orders_amount_paid_check;

alter table public.store_orders
  add constraint store_orders_amount_paid_check
  check (amount_paid between 0 and total);

create table if not exists public.store_order_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_orders(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id),
  officer_name text not null,
  amount numeric(10, 2) not null check (amount > 0),
  amount_paid_after numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists store_order_payments_order_created_idx
  on public.store_order_payments (order_id, created_at desc);

create or replace function public.validate_store_order_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_officer_name text;
begin
  if new.user_id is distinct from (select auth.uid()) then
    raise exception 'Payment records must be attributed to the signed-in admin.';
  end if;

  select coalesce(nullif(btrim(username), ''), nullif(btrim(role), ''))
  into v_officer_name
  from public.store_admins
  where user_id = (select auth.uid());

  if v_officer_name is null then
    raise exception 'Only configured store admins can record order payments.';
  end if;

  update public.store_orders
  set amount_paid = amount_paid + new.amount
  where id = new.order_id
    and status <> 'cancelled'
    and amount_paid + new.amount <= total
  returning amount_paid into new.amount_paid_after;

  if not found then
    raise exception 'Payment could not be recorded: order is missing, cancelled, or the amount exceeds its remaining balance.';
  end if;

  new.officer_name := v_officer_name;
  return new;
end;
$$;

revoke all on function public.validate_store_order_payment() from public, anon, authenticated;

drop trigger if exists store_order_payments_validate on public.store_order_payments;
create trigger store_order_payments_validate
  before insert on public.store_order_payments
  for each row execute function public.validate_store_order_payment();

alter table public.store_order_payments enable row level security;
revoke all on public.store_order_payments from anon, authenticated;
grant select, insert on public.store_order_payments to authenticated;

drop policy if exists "Store admins can read order payments" on public.store_order_payments;
create policy "Store admins can read order payments"
  on public.store_order_payments for select to authenticated
  using (
    exists (
      select 1 from public.store_admins
      where store_admins.user_id = (select auth.uid())
    )
  );

drop policy if exists "Store admins can add order payments" on public.store_order_payments;
create policy "Store admins can add order payments"
  on public.store_order_payments for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.store_admins
      where store_admins.user_id = (select auth.uid())
    )
  );

notify pgrst, 'reload schema';
