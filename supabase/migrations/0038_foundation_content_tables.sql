-- Foundation content tables referenced by archive/admin API routes.
-- These are intentionally conservative: public read, writes through guarded
-- server routes using privileged server credentials.

create table if not exists public.records (
  id text primary key,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.sources (
  id text primary key,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.collections (
  id text primary key,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.settings (
  id text primary key,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.site_content (
  id text primary key,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.records
  add column if not exists content jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

alter table public.sources
  add column if not exists content jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

alter table public.collections
  add column if not exists content jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

alter table public.settings
  add column if not exists content jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

alter table public.site_content
  add column if not exists content jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists records_updated_at_idx on public.records (updated_at desc);
create index if not exists sources_updated_at_idx on public.sources (updated_at desc);
create index if not exists collections_updated_at_idx on public.collections (updated_at desc);

alter table public.records enable row level security;
alter table public.sources enable row level security;
alter table public.collections enable row level security;
alter table public.settings enable row level security;
alter table public.site_content enable row level security;

drop policy if exists "records: public read" on public.records;
drop policy if exists "sources: public read" on public.sources;
drop policy if exists "collections: public read" on public.collections;
drop policy if exists "settings: public read" on public.settings;
drop policy if exists "site_content: public read" on public.site_content;

create policy "records: public read"
  on public.records for select
  using (true);

create policy "sources: public read"
  on public.sources for select
  using (true);

create policy "collections: public read"
  on public.collections for select
  using (true);

create policy "settings: public read"
  on public.settings for select
  using (true);

create policy "site_content: public read"
  on public.site_content for select
  using (true);

grant select on table
  public.records,
  public.sources,
  public.collections,
  public.settings,
  public.site_content
to anon, authenticated;

notify pgrst, 'reload schema';
