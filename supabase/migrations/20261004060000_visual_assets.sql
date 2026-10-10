-- Canonical store for resolved visuals. Postgres stays the source of truth; any search or vector
-- engine is a rebuildable projection of this table. Written by the offline resolver, read by feeds.
create table if not exists public.visual_assets (
  id bigserial primary key,
  record_key text not null,                -- ARED record id, or canonical external id
  image_key text not null,                 -- canonical image key (see lib/visual/index-store.ts)
  is_primary boolean not null default false,
  provider text not null,
  source_url text,
  record_url text,
  image_url text not null,
  provider_id text,
  licence text,
  attribution text,
  retrieved_at timestamptz not null default now(),
  match_confidence real not null default 1 check (match_confidence between 0 and 1),
  resolver_method text not null,
  width int,
  height int,
  dhash text,                              -- 64-bit difference hash, hex
  sha1 text,
  hue smallint,
  lum real,
  failed_at timestamptz,
  canonical_of bigint references public.visual_assets(id),
  unique (record_key, image_key)
);
create index if not exists visual_assets_record on public.visual_assets (record_key);
create index if not exists visual_assets_dhash on public.visual_assets (dhash);
create index if not exists visual_assets_sha1 on public.visual_assets (sha1);
alter table public.visual_assets enable row level security;
drop policy if exists visual_assets_read on public.visual_assets;
create policy visual_assets_read on public.visual_assets for select using (failed_at is null);
-- Writes are service-role only (no insert/update policy).
grant select, insert, update on public.visual_assets to service_role;
grant usage, select on sequence public.visual_assets_id_seq to service_role;
grant select on public.visual_assets to anon, authenticated;
