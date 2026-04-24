-- Schema for bike-one-routes on Supabase.
-- Run once against the target Supabase project (e.g. via Studio SQL editor or psql).

create table if not exists public.routes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  distance numeric not null,
  elevation integer not null,
  estimated_time bigint not null, -- milliseconds
  strava_url text,
  komoot_url text,
  image_path text, -- e.g. images/<id>.png inside the 'routes' bucket
  gpx_path text    -- e.g. gpx/<id>.gpx    inside the 'routes' bucket
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists routes_set_updated_at on public.routes;
create trigger routes_set_updated_at
  before update on public.routes
  for each row execute function public.set_updated_at();

alter table public.routes enable row level security;

drop policy if exists "routes read for anon" on public.routes;
create policy "routes read for anon"
  on public.routes
  for select
  to anon, authenticated
  using (true);

-- Public storage bucket for route assets (thumbnails + GPX files).
insert into storage.buckets (id, name, public)
  values ('routes', 'routes', true)
  on conflict (id) do nothing;
