-- Run this in Supabase: SQL Editor

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric,
  sizes jsonb default '[]'::jsonb,
  image_url text not null,
  is_available boolean default true,
  created_at timestamptz default now()
);

alter table public.products enable row level security;

create policy "Public can view available products"
on public.products for select
using (is_available = true);

create policy "Authenticated users can view all products"
on public.products for select to authenticated
using (true);

create policy "Authenticated users can insert products"
on public.products for insert to authenticated
with check (true);

create policy "Authenticated users can delete products"
on public.products for delete to authenticated
using (true);

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
