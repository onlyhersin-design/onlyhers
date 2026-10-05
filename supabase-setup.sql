-- Run this in Supabase: SQL Editor

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric,
  sizes jsonb default '[]'::jsonb,
  image_url text not null,
  image_urls jsonb default '[]'::jsonb,
  category text,
  is_available boolean default true,
  created_at timestamptz default now()
);

-- Support newer product fields even if the table was created with an older version.
alter table public.products
  add column if not exists image_urls jsonb default '[]'::jsonb,
  add column if not exists category text,
  add column if not exists product_code text,
  add column if not exists size_chart_url text,
  add column if not exists material text,
  add column if not exists wash_care text,
  add column if not exists more_details text;

alter table public.products enable row level security;

-- Remove the old broad policies. Only the Onlyhers owner can manage products.
drop policy if exists "Authenticated users can view all products" on public.products;
drop policy if exists "Authenticated users can insert products" on public.products;
drop policy if exists "Authenticated users can update products" on public.products;
drop policy if exists "Authenticated users can delete products" on public.products;

-- Public storefront users can see all products so out-of-stock designs
-- can remain visible with an "Out of Stock" label on their product page.
create policy "Public can view all products"
on public.products for select
using (true);

-- The owner can view and manage every product.
create policy "Onlyhers owner can view all products"
on public.products for select to authenticated
using ((auth.jwt() ->> 'email') = 'onlyhers.in@gmail.com');

create policy "Onlyhers owner can insert products"
on public.products for insert to authenticated
with check ((auth.jwt() ->> 'email') = 'onlyhers.in@gmail.com');

create policy "Onlyhers owner can update products"
on public.products for update to authenticated
using ((auth.jwt() ->> 'email') = 'onlyhers.in@gmail.com')
with check ((auth.jwt() ->> 'email') = 'onlyhers.in@gmail.com');

create policy "Onlyhers owner can delete products"
on public.products for delete to authenticated
using ((auth.jwt() ->> 'email') = 'onlyhers.in@gmail.com');

-- Create a PUBLIC Storage bucket named exactly: product-images
-- Then add these Storage policies:

create policy "Public can view product images"
on storage.objects for select
using (bucket_id = 'product-images');

create policy "Authenticated users can upload product images"
on storage.objects for insert to authenticated
with check (bucket_id = 'product-images');

create policy "Authenticated users can delete product images"
on storage.objects for delete to authenticated
using (bucket_id = 'product-images');


-- Fabrics catalog
create table if not exists public.fabrics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric,
  fabric_code text,
  material text,
  width text,
  image_url text not null,
  image_urls jsonb default '[]'::jsonb,
  is_available boolean default true,
  created_at timestamptz default now()
);

alter table public.fabrics
  add column if not exists description text,
  add column if not exists price numeric,
  add column if not exists fabric_code text,
  add column if not exists pattern text,
  add column if not exists available_meters integer not null default 0,
  add column if not exists material text,
  add column if not exists width text,
  add column if not exists image_url text,
  add column if not exists image_urls jsonb default '[]'::jsonb,
  add column if not exists is_available boolean default true,
  add column if not exists created_at timestamptz default now();

alter table public.fabrics enable row level security;
drop policy if exists "Public can view all fabrics" on public.fabrics;
create policy "Public can view all fabrics" on public.fabrics for select using (true);

drop policy if exists "Onlyhers owner can insert fabrics" on public.fabrics;
drop policy if exists "Onlyhers admin can insert fabrics" on public.fabrics;
create policy "Onlyhers admin can insert fabrics"
on public.fabrics for insert to authenticated
with check (auth.uid() = '3f16edba-d736-40dd-a6b1-8831a81a1c63'::uuid);

drop policy if exists "Onlyhers owner can update fabrics" on public.fabrics;
drop policy if exists "Onlyhers admin can update fabrics" on public.fabrics;
create policy "Onlyhers admin can update fabrics"
on public.fabrics for update to authenticated
using (auth.uid() = '3f16edba-d736-40dd-a6b1-8831a81a1c63'::uuid)
with check (auth.uid() = '3f16edba-d736-40dd-a6b1-8831a81a1c63'::uuid);

drop policy if exists "Onlyhers owner can delete fabrics" on public.fabrics;
drop policy if exists "Onlyhers admin can delete fabrics" on public.fabrics;
create policy "Onlyhers admin can delete fabrics"
on public.fabrics for delete to authenticated
using (auth.uid() = '3f16edba-d736-40dd-a6b1-8831a81a1c63'::uuid);
