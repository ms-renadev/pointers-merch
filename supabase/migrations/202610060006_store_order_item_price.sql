alter table public.store_order_items
  add column if not exists price numeric(10, 2);

update public.store_order_items
set price = unit_price
where price is null;

alter table public.store_order_items
  alter column price set not null;

create or replace function public.set_store_order_item_legacy_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.price is null then
    new.price := new.unit_price;
  end if;
  if new.price is null then
    raise exception 'Order item price is required.' using errcode = '23502';
  end if;
  if new.variant is null or btrim(new.variant) = '' then
    new.variant := coalesce(nullif(btrim(new.design_name), ''), 'Standard');
  end if;
  return new;
end;
$$;

drop trigger if exists store_order_items_variant_fallback on public.store_order_items;
drop trigger if exists store_order_items_legacy_fields on public.store_order_items;
create trigger store_order_items_legacy_fields
  before insert or update on public.store_order_items
  for each row execute function public.set_store_order_item_legacy_fields();

notify pgrst, 'reload schema';
