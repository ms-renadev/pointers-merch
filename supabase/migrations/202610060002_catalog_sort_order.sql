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

alter table public.store_products
  add column if not exists short_name text not null default '',
  add column if not exists product_type text not null default 'accessory',
  add column if not exists compare_at_price numeric(10, 2),
  add column if not exists meta text not null default '',
  add column if not exists sizes text[] not null default '{}',
  add column if not exists bundle_items jsonb not null default '[]'::jsonb,
  add column if not exists discount_eligible boolean not null default true,
  add column if not exists is_active boolean not null default true,
  add column if not exists sort_order integer not null default 0;

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

alter table public.store_product_variants
  add column if not exists sort_order integer not null default 0;
alter table public.store_product_variants enable row level security;

drop policy if exists "Anyone can read active store variants" on public.store_product_variants;
create policy "Anyone can read active store variants"
  on public.store_product_variants for select to anon, authenticated
  using (
    is_active and exists (
      select 1 from public.store_products
      where store_products.sku = store_product_variants.product_sku and store_products.is_active
    )
  );

grant select on public.store_products, public.store_product_variants to anon, authenticated;

insert into public.store_products (
  sku, name, short_name, category, product_type, price, compare_at_price, meta,
  description, sizes, bundle_items, discount_eligible, sort_order
) values
  ('PTR-TEE-01', 'Official CICS POINTERS T-Shirt', 'Official CICS T-Shirt', 'apparel', 'apparel', 349, 349, '240 GSM', 'Custom combed 240 GSM cotton with a low-poly Dino and CICS back illustration.', array['S','M','L','XL'], '[]', true, 1),
  ('PTR-LAN-02', 'Heavy-Duty POINTERS Lanyard', 'POINTERS Woven Lanyard', 'wearables', 'wearable', 100, 100, '1 INCH WIDTH', 'Premium satin jacquard weave with quick-release buckle, CICS crest, and safety lock clip.', '{}', '[]', true, 2),
  ('PTR-PIN-04', 'Matte Finish Button Badges (44mm)', 'Matte Button Badge (44mm)', 'accessories', 'accessory', 35, 35, '44MM · VELVET MATTE', 'Scratch-resistant velvet-touch finish with rust-proof safety-pin backing.', '{}', '[]', true, 3),
  ('PTR-KEY-03', 'Poly-Vector Meme & Node Keychains', 'Poly-Vector Acrylic Keychain', 'accessories', 'accessory', 15, 15, '3MM ACRYLIC', 'Laser-cut double-sided acrylic with an industrial stainless-steel keyring.', '{}', '[]', true, 4),
  ('PTR-STK-05', 'Holographic & Matte Tech Vinyl Decals', 'Tech Vinyl Decals', 'accessories', 'accessory', 15, 15, 'DIE-CUT VINYL', 'Waterproof, UV-resistant laminated vinyl stickers for everyday campus use.', '{}', '[]', true, 5),
  ('PTR-BNDL-A', 'Bundle Set A · Complete Pack', 'Bundle Set A', 'bundles', 'bundle', 499, 514, '5-PIECE BUNDLE', 'T-shirt, lanyard, pin, keychain, and stickers. Bundle price from the DCS price list.', array['S','M','L','XL'], '[{"sku":"PTR-TEE-01","label":"T-shirt"},{"sku":"PTR-LAN-02","label":"Lanyard"},{"sku":"PTR-PIN-04","label":"Pin"},{"sku":"PTR-KEY-03","label":"Keychain"},{"sku":"PTR-STK-05","label":"Stickers pack"}]', false, 6),
  ('PTR-BNDL-B', 'Bundle Set B · T-Shirt + Lanyard + Pins', 'Bundle Set B', 'bundles', 'bundle', 449, 484, '3-PIECE BUNDLE', 'T-shirt, lanyard, and pins. Bundle price from the DCS price list.', array['S','M','L','XL'], '[{"sku":"PTR-TEE-01","label":"T-shirt"},{"sku":"PTR-LAN-02","label":"Lanyard"},{"sku":"PTR-PIN-04","label":"Pin"}]', false, 7),
  ('PTR-BNDL-C', 'Bundle Set C · T-Shirt + Lanyard + Keychain', 'Bundle Set C', 'bundles', 'bundle', 429, 464, '3-PIECE BUNDLE', 'T-shirt, lanyard, and keychain. Bundle price from the DCS price list.', array['S','M','L','XL'], '[{"sku":"PTR-TEE-01","label":"T-shirt"},{"sku":"PTR-LAN-02","label":"Lanyard"},{"sku":"PTR-KEY-03","label":"Keychain"}]', false, 8),
  ('PTR-BNDL-D', 'Bundle Set D · T-Shirt + Lanyard', 'Bundle Set D', 'bundles', 'bundle', 419, 449, '2-PIECE BUNDLE', 'T-shirt and lanyard. Bundle price from the DCS price list.', array['S','M','L','XL'], '[{"sku":"PTR-TEE-01","label":"T-shirt"},{"sku":"PTR-LAN-02","label":"Lanyard"}]', false, 9)
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

create index if not exists store_product_variants_product_order_idx
  on public.store_product_variants (product_sku, sort_order);

notify pgrst, 'reload schema';
