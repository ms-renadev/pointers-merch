update public.store_products
set sizes = array['S', 'M', 'L', 'XL', '2XL'],
    updated_at = now()
where sku = 'PTR-TEE-01';

update public.store_products
set sizes = array['S', 'M', 'L', 'XL', '2XL'],
    updated_at = now()
where sku in ('PTR-BNDL-A', 'PTR-BNDL-B', 'PTR-BNDL-C', 'PTR-BNDL-D');

do $$
declare
  v_function_definition text;
  v_component_size_guard text := $guard$        if v_size = '2XL' then
          raise exception '2XL is no longer an available size.' using errcode = '22023';
        end if;
$guard$;
  v_product_size_guard text := $guard$      if v_size = '2XL' then
        raise exception '2XL is no longer an available size.' using errcode = '22023';
      end if;
$guard$;
begin
  v_function_definition := pg_get_functiondef(
    'public.create_store_order(jsonb, text, boolean, jsonb)'::regprocedure
  );

  if position(v_component_size_guard in v_function_definition) > 0
     and position(v_product_size_guard in v_function_definition) > 0 then
    v_function_definition := replace(v_function_definition, v_component_size_guard, '');
    v_function_definition := replace(v_function_definition, v_product_size_guard, '');
    execute v_function_definition;
  elsif position('2XL is no longer an available size.' in v_function_definition) > 0 then
    raise exception 'Could not safely update the 2XL validation in public.create_store_order.';
  end if;
end;
$$;
