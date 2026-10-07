alter table public.store_admins
  add column if not exists username text,
  add column if not exists role text not null default 'assistant';

create unique index if not exists store_admins_username_unique_idx
  on public.store_admins (username)
  where username is not null;

grant select on public.store_admins to authenticated;

notify pgrst, 'reload schema';
