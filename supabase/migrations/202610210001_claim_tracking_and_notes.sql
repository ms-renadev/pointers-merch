alter table public.store_order_items
  add column if not exists claimed_quantity integer not null default 0;

alter table public.store_order_items
  drop constraint if exists store_order_items_claimed_quantity_check;

alter table public.store_order_items
  add constraint store_order_items_claimed_quantity_check
  check (claimed_quantity between 0 and quantity);

grant update (claimed_quantity) on public.store_order_items to authenticated;

drop policy if exists "Store admins can update claimed order quantities" on public.store_order_items;
create policy "Store admins can update claimed order quantities"
  on public.store_order_items for update to authenticated
  using (
    exists (
      select 1 from public.store_admins
      where store_admins.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.store_admins
      where store_admins.user_id = (select auth.uid())
    )
  );

create table if not exists public.store_order_admin_notes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_orders(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id),
  officer_name text not null,
  note text not null check (length(btrim(note)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists store_order_admin_notes_order_created_idx
  on public.store_order_admin_notes (order_id, created_at desc);

create or replace function public.set_store_order_note_officer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select coalesce(nullif(btrim(username), ''), nullif(btrim(role), ''))
  into new.officer_name
  from public.store_admins
  where user_id = new.user_id;

  if new.officer_name is null then
    raise exception 'Only configured store admins can add order notes.';
  end if;

  return new;
end;
$$;

drop trigger if exists store_order_admin_notes_officer on public.store_order_admin_notes;
create trigger store_order_admin_notes_officer
  before insert on public.store_order_admin_notes
  for each row execute function public.set_store_order_note_officer();

alter table public.store_order_admin_notes enable row level security;
grant select, insert on public.store_order_admin_notes to authenticated;

drop policy if exists "Store admins can read order notes" on public.store_order_admin_notes;
create policy "Store admins can read order notes"
  on public.store_order_admin_notes for select to authenticated
  using (
    exists (
      select 1 from public.store_admins
      where store_admins.user_id = (select auth.uid())
    )
  );

drop policy if exists "Store admins can add order notes" on public.store_order_admin_notes;
create policy "Store admins can add order notes"
  on public.store_order_admin_notes for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.store_admins
      where store_admins.user_id = (select auth.uid())
    )
  );

create or replace function public.claim_store_orders(p_order_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.store_admins
    where user_id = (select auth.uid())
  ) then
    raise exception 'Only store admins can mark orders as claimed.';
  end if;

  if coalesce(cardinality(p_order_ids), 0) = 0 then
    raise exception 'Select at least one order to release.';
  end if;

  update public.store_order_items as items
  set claimed_quantity = items.quantity
  where items.order_id = any(p_order_ids)
    and exists (
      select 1
      from public.store_orders as orders
      where orders.id = items.order_id
        and orders.status <> 'cancelled'
    );
end;
$$;

revoke all on function public.claim_store_orders(uuid[]) from public, anon;
grant execute on function public.claim_store_orders(uuid[]) to authenticated;

notify pgrst, 'reload schema';
