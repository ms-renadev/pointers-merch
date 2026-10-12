alter table public.store_orders
  add column if not exists gcash_fee numeric(10, 2) not null default 0
  check (gcash_fee >= 0);

create or replace function public.apply_store_gcash_fee()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.gcash_fee := case
    when new.payment_method = 'GCash' then 5
    else 0
  end;
  new.total := new.subtotal - new.discount_amount + new.gcash_fee;
  return new;
end;
$$;

drop trigger if exists store_orders_gcash_fee on public.store_orders;
create trigger store_orders_gcash_fee
  before insert on public.store_orders
  for each row execute function public.apply_store_gcash_fee();

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

  select jsonb_build_object(
    'id', store_orders.id,
    'reference_code', store_orders.reference_code,
    'subtotal', store_orders.subtotal,
    'discount_amount', store_orders.discount_amount,
    'gcash_fee', store_orders.gcash_fee,
    'total', store_orders.total,
    'status', store_orders.status
  )
  into v_order
  from public.store_orders
  where store_orders.id = (v_order->>'id')::uuid;

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
