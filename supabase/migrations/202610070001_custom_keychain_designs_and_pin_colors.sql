insert into public.store_product_variants (
  product_sku, name, label, image_path, sort_order, is_active
)
select
  'PTR-KEY-03', 'Custom design', 'Custom design · Upload your file', null,
  coalesce(max(sort_order), 0) + 1, true
from public.store_product_variants
where product_sku = 'PTR-KEY-03'
on conflict (product_sku, name) do update
set label = excluded.label, is_active = true;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'custom-designs',
  'custom-designs',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.custom_design_is_unlinked(p_object_name text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select not exists (
    select 1
    from public.store_order_items
    where selections @> jsonb_build_array(jsonb_build_object('file_path', p_object_name))
  );
$$;

revoke all on function public.custom_design_is_unlinked(text) from public;
grant execute on function public.custom_design_is_unlinked(text) to anon, authenticated;

drop policy if exists "Customers can upload custom designs" on storage.objects;
create policy "Customers can upload custom designs"
  on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'custom-designs'
    and name ~ '^[0-9a-f-]{36}/custom-design\.(jpg|png|webp|pdf)$'
  );

drop policy if exists "Customers can remove unlinked custom designs" on storage.objects;
create policy "Customers can remove unlinked custom designs"
  on storage.objects for delete to anon, authenticated
  using (
    bucket_id = 'custom-designs'
    and name ~ '^[0-9a-f-]{36}/custom-design\.(jpg|png|webp|pdf)$'
    and public.custom_design_is_unlinked(name)
  );

drop policy if exists "Store admins can read custom designs" on storage.objects;
create policy "Store admins can read custom designs"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'custom-designs'
    and exists (
      select 1
      from public.store_order_items
      join public.store_orders on store_orders.id = store_order_items.order_id
      join public.store_admins on store_admins.user_id = (select auth.uid())
      where store_order_items.selections @> jsonb_build_array(
        jsonb_build_object('file_path', storage.objects.name)
      )
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
  v_options jsonb;
  v_validated_components jsonb;
  v_design text;
  v_component_design text;
  v_design_summary text;
  v_size text;
  v_quantity integer;
  v_color text;
  v_file_path text;
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
    v_options := coalesce(v_item->'options', '[]'::jsonb);

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
      if jsonb_typeof(v_components) <> 'array'
         or jsonb_array_length(v_components) <> jsonb_array_length(v_product.bundle_items)
         or jsonb_typeof(v_options) <> 'array'
         or jsonb_array_length(v_options) <> 0 then
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

        v_color := nullif(btrim(v_component->>'color'), '');
        if v_component_product.sku = 'PTR-PIN-04'
           and (v_color is null or v_color not in ('Beige', 'Magenta')) then
          raise exception 'Choose a valid button badge color.' using errcode = '22023';
        elsif v_component_product.sku <> 'PTR-PIN-04' and v_color is not null then
          raise exception 'Color selection is only available for button badges.' using errcode = '22023';
        end if;

        v_design_summary := v_design_summary
          || case when v_design_summary = '' then '' else ' / ' end
          || (v_expected_component->>'label') || ': ' || v_component_design
          || case when v_color is null then '' else ' · ' || v_color end
          || case when v_size is null then '' else ' · Size ' || v_size end;
        v_validated_components := v_validated_components || jsonb_build_array(
          jsonb_strip_nulls(jsonb_build_object(
            'sku', v_component_product.sku,
            'name', v_expected_component->>'label',
            'design', v_component_design,
            'color', v_color,
            'size', v_size
          ))
        );
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
      v_size := null;
    else
      if jsonb_typeof(v_components) <> 'array' or jsonb_array_length(v_components) <> 0 then
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

      if jsonb_typeof(v_options) <> 'array' then
        raise exception 'Invalid product options.' using errcode = '22023';
      end if;
      v_validated_components := '[]'::jsonb;
      if v_product.sku = 'PTR-PIN-04' then
        if jsonb_array_length(v_options) <> 1
           or v_options->0->>'name' <> 'Color'
           or v_options->0->>'design' is null
           or v_options->0->>'design' not in ('Beige', 'Magenta') then
          raise exception 'Choose a valid button badge color.' using errcode = '22023';
        end if;
        v_validated_components := v_options;
      elsif v_product.sku = 'PTR-KEY-03' and v_design = 'Custom design' then
        if jsonb_array_length(v_options) <> 1
           or v_options->0->>'name' <> 'Custom design file'
           or nullif(btrim(v_options->0->>'design'), '') is null
           or length(v_options->0->>'design') > 180 then
          raise exception 'Upload a custom keychain design file.' using errcode = '22023';
        end if;
        v_file_path := v_options->0->>'file_path';
        if v_file_path is null
           or v_file_path !~ '^[0-9a-f-]{36}/custom-design\.(jpg|png|webp|pdf)$'
           or not exists (
             select 1 from storage.objects
             where bucket_id = 'custom-designs'
               and name = v_file_path
           ) then
          raise exception 'Upload the custom keychain design file before confirming the pre-order.' using errcode = '22023';
        end if;
        v_validated_components := v_options;
      elsif jsonb_array_length(v_options) <> 0 then
        raise exception 'This product does not accept additional options.' using errcode = '22023';
      end if;
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
      order_id, product_sku, product_name, price, variant, design_name, size, quantity, unit_price, line_total, selections
    ) values (
      v_order_id,
      v_line->>'sku',
      v_line->>'name',
      (v_line->>'unit_price')::numeric,
      v_line->>'design',
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

notify pgrst, 'reload schema';
