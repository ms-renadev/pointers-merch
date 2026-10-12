create or replace function public.reject_store_orders_after_preorder_deadline()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if clock_timestamp() >= timestamptz '2026-10-13 00:00:00+08' then
    raise exception 'Pre-order phase closed. New orders are no longer being accepted.'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

drop trigger if exists store_orders_preorder_deadline on public.store_orders;
create trigger store_orders_preorder_deadline
  before insert on public.store_orders
  for each row execute function public.reject_store_orders_after_preorder_deadline();
