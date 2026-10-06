create extension if not exists pgcrypto;

create table if not exists public.store_products (
  sku text primary key,
  name text not null,
  short_name text not null,
  category text not null check (category in ('apparel', 'wearables', 'accessories', 'bundles')),
  product_type text not null check (product_type in ('apparel', 'wearable', 'accessory', 'bundle')),
  price numeric(10, 2) not null check (price >= 0),
  compare_at_price numeric(10, 2) check (compare_at_price is null or compare_at_price >= price),
  meta text not null default '',
  description text not null default '',
  sizes text[] not null default '{}',
  bundle_items jsonb not null default '[]'::jsonb check (jsonb_typeof(bundle_items) = 'array'),
  discount_eligible boolean not null default true,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_product_variants (
  id uuid primary key default gen_random_uuid(),
  product_sku text not null references public.store_products(sku) on delete cascade,
  name text not null,
  label text,
  image_path text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (product_sku, name)
);

alter table public.store_products
  add column if not exists sort_order integer not null default 0;
alter table public.store_product_variants
  add column if not exists sort_order integer not null default 0;

create table if not exists public.store_orders (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique,
  customer_name text not null,
  university_id text not null,
  email text not null,
  phone text not null,
  program text not null,
  payment_method text not null check (payment_method in ('GCash', 'Cash over the counter')),
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  discount_amount numeric(10, 2) not null default 0 check (discount_amount >= 0),
  total numeric(10, 2) not null check (total >= 0),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'fulfilled', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_orders(id) on delete cascade,
  product_sku text not null references public.store_products(sku) on delete restrict,
  product_name text not null,
  design_name text not null,
  size text,
  quantity integer not null check (quantity between 1 and 20),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  line_total numeric(10, 2) not null check (line_total >= 0),
  selections jsonb not null default '[]'::jsonb check (jsonb_typeof(selections) = 'array'),
  created_at timestamptz not null default now()
);
alter table public.store_order_items
  add column if not exists selections jsonb not null default '[]'::jsonb;

create index if not exists store_product_variants_product_order_idx
  on public.store_product_variants (product_sku, sort_order);
create index if not exists store_orders_created_at_idx
  on public.store_orders (created_at desc);
create index if not exists store_order_items_order_id_idx
  on public.store_order_items (order_id);

create or replace function public.set_store_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists store_products_updated_at on public.store_products;
create trigger store_products_updated_at
  before update on public.store_products
  for each row execute function public.set_store_updated_at();

drop trigger if exists store_orders_updated_at on public.store_orders;
create trigger store_orders_updated_at
  before update on public.store_orders
  for each row execute function public.set_store_updated_at();

alter table public.store_products enable row level security;
alter table public.store_product_variants enable row level security;
alter table public.store_orders enable row level security;
alter table public.store_order_items enable row level security;

drop policy if exists "Anyone can read active store products" on public.store_products;
create policy "Anyone can read active store products"
  on public.store_products for select to anon, authenticated
  using (is_active);

drop policy if exists "Anyone can read active store variants" on public.store_product_variants;
create policy "Anyone can read active store variants"
  on public.store_product_variants for select to anon, authenticated
  using (
    is_active and exists (
      select 1 from public.store_products
      where store_products.sku = store_product_variants.product_sku and store_products.is_active
    )
  );

create table if not exists public.store_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.store_admins enable row level security;
grant select on public.store_admins to authenticated;
drop policy if exists "Admins can read their own role" on public.store_admins;
create policy "Admins can read their own role"
  on public.store_admins for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.store_products, public.store_product_variants to anon, authenticated;
grant select on public.store_orders, public.store_order_items to authenticated;
grant update (status) on public.store_orders to authenticated;

drop policy if exists "Store admins can read store orders" on public.store_orders;
create policy "Store admins can read store orders"
  on public.store_orders for select to authenticated
  using (
    exists (
      select 1 from public.store_admins
      where store_admins.user_id = (select auth.uid())
    )
  );

drop policy if exists "Store admins can update store order status" on public.store_orders;
create policy "Store admins can update store order status"
  on public.store_orders for update to authenticated
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

drop policy if exists "Store admins can read store order items" on public.store_order_items;
create policy "Store admins can read store order items"
  on public.store_order_items for select to authenticated
  using (
    exists (
      select 1 from public.store_admins
      where store_admins.user_id = (select auth.uid())
    )
  );

create or replace function public.create_store_order(
  p_customer jsonb,
  p_payment_method text,
  p_discount_requested boolean,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid := gen_random_uuid();
  v_reference text := 'PTR-' || to_char(now() at time zone 'UTC', 'YYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  v_item jsonb;
  v_line jsonb;
  v_component jsonb;
  v_product record;
  v_component_product record;
  v_expected_component jsonb;
  v_validated_items jsonb := '[]'::jsonb;
  v_components jsonb;
  v_validated_components jsonb;
  v_design text;
  v_component_design text;
  v_design_summary text;
  v_size text;
  v_quantity integer;
  v_subtotal numeric(10, 2) := 0;
  v_discount numeric(10, 2) := 0;
  v_total numeric(10, 2);
  v_name text;
  v_university_id text;
  v_email text;
  v_phone text;
  v_program text;
  v_payment text := p_payment_method;
begin
  if coalesce(jsonb_typeof(p_customer), '') <> 'object'
     or coalesce(jsonb_typeof(p_items), '') <> 'array' then
    raise exception 'Invalid reservation details.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 30 then
    raise exception 'Invalid reservation details.' using errcode = '22023';
  end if;

  v_name := nullif(btrim(p_customer->>'name'), '');
  v_university_id := nullif(btrim(p_customer->>'studentId'), '');
  v_email := nullif(lower(btrim(p_customer->>'email')), '');
  v_phone := nullif(btrim(p_customer->>'phone'), '');
  v_program := nullif(btrim(p_customer->>'program'), '');

  if v_name is null or length(v_name) > 120
     or v_university_id is null or length(v_university_id) > 40
     or v_email is null or length(v_email) > 254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or v_phone is null or length(v_phone) > 40
     or v_program is null or length(v_program) > 120 then
    raise exception 'Please provide valid student details.' using errcode = '22023';
  end if;

  if v_payment is null or v_payment not in ('GCash', 'Cash over the counter') then
    raise exception 'Invalid payment method.' using errcode = '22023';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(v_item) <> 'object'
       or coalesce(v_item->>'quantity', '') !~ '^[1-9][0-9]*$' then
      raise exception 'Invalid order item.' using errcode = '22023';
    end if;

    v_quantity := (v_item->>'quantity')::integer;
    v_design := nullif(btrim(v_item->>'design'), '');
    v_size := nullif(btrim(v_item->>'size'), '');
    v_components := coalesce(v_item->'components', '[]'::jsonb);

    if v_quantity > 20 then
      raise exception 'Item quantity cannot exceed 20.' using errcode = '22023';
    end if;

    select p.* into v_product
    from public.store_products as p
    where p.sku = v_item->>'sku' and p.is_active;

    if not found then
      raise exception 'A selected product is unavailable.' using errcode = '22023';
    end if;

    if v_product.product_type = 'bundle' then
      if jsonb_typeof(v_components) <> 'array' then
        raise exception 'Choose a design for every item in the bundle.' using errcode = '22023';
      end if;
      if jsonb_array_length(v_components) <> jsonb_array_length(v_product.bundle_items) then
        raise exception 'Choose a design for every item in the bundle.' using errcode = '22023';
      end if;

      v_validated_components := '[]'::jsonb;
      v_design_summary := '';
      for v_component in select value from jsonb_array_elements(v_components)
      loop
        if jsonb_typeof(v_component) <> 'object'
           or nullif(btrim(v_component->>'sku'), '') is null
           or nullif(btrim(v_component->>'design'), '') is null then
          raise exception 'A bundle item is missing a design.' using errcode = '22023';
        end if;

        select component.value into v_expected_component
        from jsonb_array_elements(v_product.bundle_items) as component(value)
        where component.value->>'sku' = v_component->>'sku';

        if not found then
          raise exception 'A selected item is not included in this bundle.' using errcode = '22023';
        end if;

        select p.* into v_component_product
        from public.store_products as p
        where p.sku = v_component->>'sku' and p.is_active;

        if not found then
          raise exception 'A selected bundle item is unavailable.' using errcode = '22023';
        end if;

        v_component_design := nullif(btrim(v_component->>'design'), '');
        if not exists (
          select 1 from public.store_product_variants as pv
          where pv.product_sku = v_component_product.sku
            and pv.name = v_component_design
            and pv.is_active
        ) then
          raise exception 'A selected bundle design is unavailable.' using errcode = '22023';
        end if;

        v_size := nullif(btrim(v_component->>'size'), '');
        if v_size = '2XL' then
          raise exception '2XL is no longer an available size.' using errcode = '22023';
        end if;
        if cardinality(v_component_product.sizes) > 0
           and (v_size is null or not (v_size = any(v_component_product.sizes))) then
          raise exception 'A selected bundle item size is unavailable.' using errcode = '22023';
        elsif cardinality(v_component_product.sizes) = 0 and v_size is not null then
          raise exception 'This bundle item does not have a size option.' using errcode = '22023';
        end if;

        v_design_summary := v_design_summary
          || case when v_design_summary = '' then '' else ' / ' end
          || (v_expected_component->>'label') || ': ' || v_component_design
          || case when v_size is null then '' else ' · Size ' || v_size end;
        v_validated_components := v_validated_components || jsonb_build_array(jsonb_build_object(
          'sku', v_component_product.sku,
          'name', v_component_product.name,
          'design', v_component_design,
          'size', v_size
        ));
      end loop;

      if exists (
        select 1
        from jsonb_array_elements(v_product.bundle_items) as required(value)
        where not exists (
          select 1
          from jsonb_array_elements(v_components) as chosen(value)
          where chosen.value->>'sku' = required.value->>'sku'
        )
      ) then
        raise exception 'Choose a design for every item in the bundle.' using errcode = '22023';
      end if;
      v_design := v_design_summary;
    else
      if jsonb_typeof(v_components) <> 'array' then
        raise exception 'Only bundle products accept component design selections.' using errcode = '22023';
      end if;
      if jsonb_array_length(v_components) <> 0 then
        raise exception 'Only bundle products accept component design selections.' using errcode = '22023';
      end if;

      if v_design is null or not exists (
        select 1 from public.store_product_variants as pv
        where pv.product_sku = v_product.sku
          and pv.name = v_design
          and pv.is_active
      ) then
        raise exception 'A selected product design is unavailable.' using errcode = '22023';
      end if;

      if v_size = '2XL' then
        raise exception '2XL is no longer an available size.' using errcode = '22023';
      end if;
      if cardinality(v_product.sizes) > 0
         and (v_size is null or not (v_size = any(v_product.sizes))) then
        raise exception 'A selected product size is unavailable.' using errcode = '22023';
      elsif cardinality(v_product.sizes) = 0 and v_size is not null then
        raise exception 'This product does not have a size option.' using errcode = '22023';
      end if;
      v_validated_components := '[]'::jsonb;
    end if;

    v_subtotal := v_subtotal + (v_product.price * v_quantity);

    v_validated_items := v_validated_items || jsonb_build_array(jsonb_build_object(
      'sku', v_product.sku,
      'name', v_product.name,
      'design', v_design,
      'size', v_size,
      'components', v_validated_components,
      'quantity', v_quantity,
      'unit_price', v_product.price
    ));
  end loop;

  v_total := v_subtotal;

  insert into public.store_orders (
    id, reference_code, customer_name, university_id, email, phone, program,
    payment_method, subtotal, discount_amount, total
  ) values (
    v_order_id, v_reference, v_name, v_university_id, v_email, v_phone, v_program,
    v_payment, v_subtotal, v_discount, v_total
  );

  for v_line in select value from jsonb_array_elements(v_validated_items)
  loop
    insert into public.store_order_items (
      order_id, product_sku, product_name, design_name, size, quantity, unit_price, line_total, selections
    ) values (
      v_order_id,
      v_line->>'sku',
      v_line->>'name',
      v_line->>'design',
      v_line->>'size',
      (v_line->>'quantity')::integer,
      (v_line->>'unit_price')::numeric,
      (v_line->>'unit_price')::numeric * (v_line->>'quantity')::integer,
      coalesce(v_line->'components', '[]'::jsonb)
    );
  end loop;

  return jsonb_build_object(
    'id', v_order_id,
    'reference_code', v_reference,
    'subtotal', v_subtotal,
    'discount_amount', v_discount,
    'total', v_total,
    'status', 'pending'
  );
end;
$$;

revoke all on function public.create_store_order(jsonb, text, boolean, jsonb) from public;
grant execute on function public.create_store_order(jsonb, text, boolean, jsonb) to anon, authenticated;

insert into public.store_products (
  sku, name, short_name, category, product_type, price, compare_at_price, meta,
  description, sizes, bundle_items, discount_eligible, sort_order
) values
  ('PTR-TEE-01', 'Official CICS POINTERS Graphic Tee', 'Official CICS Graphic Tee', 'apparel', 'apparel', 349, 349, '240 GSM', 'Custom combed 240 GSM cotton with a low-poly Dino and CICS back illustration.', array['S','M','L','XL'], '[]', true, 1),
  ('PTR-LAN-02', 'Heavy-Duty POINTERS Lanyard', 'POINTERS Woven Lanyard', 'wearables', 'wearable', 100, 100, '1 INCH WIDTH', 'Premium satin jacquard weave with quick-release buckle, CICS crest, and safety lock clip.', '{}', '[]', true, 2),
  ('PTR-PIN-04', 'Matte Finish Button Badges (44mm)', 'Matte Button Badge (44mm)', 'accessories', 'accessory', 35, 35, '44MM · VELVET MATTE', 'Scratch-resistant velvet-touch finish with rust-proof safety-pin backing.', '{}', '[]', true, 3),
  ('PTR-KEY-03', 'Poly-Vector Meme & Node Keychains', 'Poly-Vector Acrylic Keychain', 'accessories', 'accessory', 15, 15, '3MM ACRYLIC', 'Laser-cut double-sided acrylic with an industrial stainless-steel keyring.', '{}', '[]', true, 4),
  ('PTR-STK-05', 'Holographic & Matte Tech Vinyl Decals', 'Tech Vinyl Decals', 'accessories', 'accessory', 15, 15, 'DIE-CUT VINYL', 'Waterproof, UV-resistant laminated vinyl stickers for everyday campus use.', '{}', '[]', true, 5),
  ('PTR-BNDL-A', 'Bundle Set A · Complete Pack', 'Bundle Set A', 'bundles', 'bundle', 499, 514, '5-PIECE BUNDLE', 'T-shirt, lanyard, pin, keychain, and stickers. Bundle price from the DCS price list.', array['S','M','L','XL'], '[{"sku":"PTR-TEE-01","label":"T-shirt"},{"sku":"PTR-LAN-02","label":"Lanyard"},{"sku":"PTR-PIN-04","label":"Pin"},{"sku":"PTR-KEY-03","label":"Keychain"},{"sku":"PTR-STK-05","label":"Stickers pack"}]', false, 6),
  ('PTR-BNDL-B', 'Bundle Set B · Tee + Lanyard + Pins', 'Bundle Set B', 'bundles', 'bundle', 449, 484, '3-PIECE BUNDLE', 'T-shirt, lanyard, and pins. Bundle price from the DCS price list.', array['S','M','L','XL'], '[{"sku":"PTR-TEE-01","label":"T-shirt"},{"sku":"PTR-LAN-02","label":"Lanyard"},{"sku":"PTR-PIN-04","label":"Pin"}]', false, 7),
  ('PTR-BNDL-C', 'Bundle Set C · Tee + Lanyard + Keychain', 'Bundle Set C', 'bundles', 'bundle', 429, 464, '3-PIECE BUNDLE', 'T-shirt, lanyard, and keychain. Bundle price from the DCS price list.', array['S','M','L','XL'], '[{"sku":"PTR-TEE-01","label":"T-shirt"},{"sku":"PTR-LAN-02","label":"Lanyard"},{"sku":"PTR-KEY-03","label":"Keychain"}]', false, 8),
  ('PTR-BNDL-D', 'Bundle Set D · Tee + Lanyard', 'Bundle Set D', 'bundles', 'bundle', 419, 449, '2-PIECE BUNDLE', 'T-shirt and lanyard. Bundle price from the DCS price list.', array['S','M','L','XL'], '[{"sku":"PTR-TEE-01","label":"T-shirt"},{"sku":"PTR-LAN-02","label":"Lanyard"}]', false, 9)
on conflict (sku) do update set
  name = excluded.name,
  short_name = excluded.short_name,
  category = excluded.category,
  product_type = excluded.product_type,
  price = excluded.price,
  compare_at_price = excluded.compare_at_price,
  meta = excluded.meta,
  description = excluded.description,
  sizes = excluded.sizes,
  bundle_items = excluded.bundle_items,
  discount_eligible = excluded.discount_eligible,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.store_product_variants (product_sku, name, label, image_path, sort_order) values
  ('PTR-TEE-01', 'Version A', 'Version A · Magenta sleeves', 'Tshirt_1', 1),
  ('PTR-TEE-01', 'Version B', 'Version B · Monochrome cream', 'Tshirt_2', 2),
  ('PTR-TEE-01', 'Version C', 'Version C · Computer science student', 'Tshirt_3', 3),
  ('PTR-TEE-01', 'Version D', 'Version D · No sleep, code, eat, repeat', 'Tshirt_4', 4),
  ('PTR-LAN-02', 'Version A', 'Version A · Kompsay waves', 'IDLace_2', 1),
  ('PTR-LAN-02', 'Version B', 'Version B · MSU cloud', 'IDLace_1', 2),
  ('PTR-PIN-04', 'Pin A', 'Pin A · Kompsyman', 'pins', 1),
  ('PTR-PIN-04', 'Pin B', 'Pin B · Computer Science', 'pins', 2),
  ('PTR-PIN-04', 'Pin C', 'Pin C · CICS Logo', 'pins', 3),
  ('PTR-PIN-04', 'Pin D', 'Pin D · Iskolar ng Bayan at Teknolohiya', 'pins', 4),
  ('PTR-KEY-03', 'V1', 'V1 · Crying Cat Typing Meme', 'keychains', 1),
  ('PTR-KEY-03', 'V2', 'V2 · The Code Doesn''t Work / Works Why?', 'keychains', 2),
  ('PTR-KEY-03', 'V3', 'V3 · Studying Cat Drawing', 'keychains', 3),
  ('PTR-KEY-03', 'V4', 'V4 · Frieren C++ Programming', 'keychains', 4),
  ('PTR-KEY-03', 'V5', 'V5 · Progress Over Perfection', 'keychains', 5),
  ('PTR-KEY-03', 'V6', 'V6 · Go Study!', 'keychains', 6),
  ('PTR-KEY-03', 'V7', 'V7 · I Need To Pass Meme', 'keychains', 7),
  ('PTR-STK-05', 'Sticker', 'Sticker · Tech Vinyl', 'Stickers', 1)
on conflict (product_sku, name) do update set
  label = excluded.label,
  image_path = excluded.image_path,
  sort_order = excluded.sort_order,
  is_active = true;

update public.store_product_variants
set is_active = false
where product_sku in ('PTR-BNDL-A', 'PTR-BNDL-B', 'PTR-BNDL-C', 'PTR-BNDL-D');
