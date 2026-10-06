alter table public.store_orders
  add column if not exists college text,
  add column if not exists payment_receipt_path text;

alter table public.store_orders
  alter column university_id drop not null;

alter table public.store_order_items
  add column if not exists variant text,
  add column if not exists price numeric(10, 2);

update public.store_order_items
set variant = coalesce(nullif(btrim(variant), ''), nullif(btrim(design_name), ''), 'Standard')
where variant is null or btrim(variant) = '';

update public.store_order_items
set price = unit_price
where price is null;

alter table public.store_order_items
  alter column variant set not null,
  alter column price set not null;

create or replace function public.set_store_order_item_legacy_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.variant is null or btrim(new.variant) = '' then
    new.variant := coalesce(nullif(btrim(new.design_name), ''), 'Standard');
  end if;
  if new.price is null then
    new.price := new.unit_price;
  end if;
  if new.price is null then
    raise exception 'Order item price is required.' using errcode = '23502';
  end if;
  return new;
end;
$$;

drop trigger if exists store_order_items_variant_fallback on public.store_order_items;
drop trigger if exists store_order_items_legacy_fields on public.store_order_items;
create trigger store_order_items_legacy_fields
  before insert or update on public.store_order_items
  for each row execute function public.set_store_order_item_legacy_fields();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs',
  'payment-proofs',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.payment_proof_is_unlinked(p_object_name text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.store_orders
    where payment_receipt_path = p_object_name
  );
$$;

revoke all on function public.payment_proof_is_unlinked(text) from public;
grant execute on function public.payment_proof_is_unlinked(text) to anon, authenticated;

drop policy if exists "Customers can upload payment proofs" on storage.objects;
create policy "Customers can upload payment proofs"
  on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'payment-proofs'
    and name ~ '^[0-9a-f-]{36}/payment-proof\.(jpg|png|webp|pdf)$'
  );

drop policy if exists "Customers can remove unlinked payment proofs" on storage.objects;
create policy "Customers can remove unlinked payment proofs"
  on storage.objects for delete to anon, authenticated
  using (
    bucket_id = 'payment-proofs'
    and name ~ '^[0-9a-f-]{36}/payment-proof\.(jpg|png|webp|pdf)$'
    and public.payment_proof_is_unlinked(name)
  );

drop policy if exists "Store admins can read payment proofs" on storage.objects;
create policy "Store admins can read payment proofs"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'payment-proofs'
    and exists (
      select 1
      from public.store_orders
      join public.store_admins on store_admins.user_id = (select auth.uid())
      where store_orders.payment_receipt_path = storage.objects.name
    )
  );

create or replace function public.create_store_order(
  p_customer jsonb,
  p_payment_method text,
  p_discount_requested boolean,
  p_items jsonb,
  p_payment_receipt_path text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order jsonb;
  v_items jsonb;
  v_college text;
  v_program text;
begin
  if coalesce(jsonb_typeof(p_customer), '') <> 'object' then
    raise exception 'Invalid reservation details.' using errcode = '22023';
  end if;

  v_college := nullif(btrim(p_customer->>'college'), '');
  v_program := nullif(btrim(p_customer->>'program'), '');
  if v_college is null or length(v_college) > 120
     or v_program is null or length(v_program) > 120 then
    raise exception 'Please provide a valid college and program.' using errcode = '22023';
  end if;

  if p_payment_method = 'GCash' then
    if p_payment_receipt_path is null
       or p_payment_receipt_path !~ '^[0-9a-f-]{36}/payment-proof\.(jpg|png|webp|pdf)$'
       or not exists (
         select 1 from storage.objects
         where bucket_id = 'payment-proofs'
           and name = p_payment_receipt_path
       ) then
      raise exception 'Upload your GCash payment receipt before confirming the pre-order.' using errcode = '22023';
    end if;
  elsif p_payment_method = 'Cash over the counter' then
    if p_payment_receipt_path is not null then
      raise exception 'Cash over the counter orders do not accept a GCash receipt.' using errcode = '22023';
    end if;
  else
    raise exception 'Invalid payment method.' using errcode = '22023';
  end if;

  v_order := public.create_store_order(
    jsonb_set(p_customer, '{studentId}', '"NOT REQUIRED"', true),
    p_payment_method,
    false,
    p_items
  );

  update public.store_orders
  set college = v_college,
      university_id = null,
      payment_receipt_path = p_payment_receipt_path
  where id = (v_order->>'id')::uuid;

  select coalesce(
    jsonb_agg(jsonb_build_object(
      'product_sku', item.product_sku,
      'product_name', item.product_name,
      'design_name', item.design_name,
      'variant', item.variant,
      'size', item.size,
      'quantity', item.quantity,
      'unit_price', item.unit_price,
      'line_total', item.line_total,
      'selections', item.selections
    ) order by item.created_at, item.id),
    '[]'::jsonb
  )
  into v_items
  from public.store_order_items as item
  where item.order_id = (v_order->>'id')::uuid;

  return v_order || jsonb_build_object(
    'items', v_items,
    'payment_method', p_payment_method
  );
end;
$$;

revoke all on function public.create_store_order(jsonb, text, boolean, jsonb, text) from public;
grant execute on function public.create_store_order(jsonb, text, boolean, jsonb, text) to anon, authenticated;

notify pgrst, 'reload schema';
