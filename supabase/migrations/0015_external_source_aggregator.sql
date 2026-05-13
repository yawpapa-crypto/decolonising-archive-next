-- External open-access aggregation (metadata-only discovery layer).
-- Note: 0014 is already used in this repo; this migration is numbered 0015.

create table if not exists public.external_sources (
  id text primary key,
  label text not null,
  description text,
  base_url text not null,
  search_url_template text,
  source_type text not null,
  region text,
  country text,
  integration_mode text not null,
  requires_api_key boolean default false,
  enabled boolean default true,
  rights_default text,
  rights_caution text,
  access_default text,
  metadata_confidence text,
  last_synced_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.external_records (
  id uuid primary key default gen_random_uuid(),
  source_id text references public.external_sources (id) on delete restrict,
  external_id text,
  title text not null,
  creator text,
  contributors text[] default '{}',
  description text,
  publisher text,
  publication_date text,
  source_url text not null,
  download_url text,
  licence text,
  licence_uri text,
  rights_label text not null default 'Check source',
  licence_label text,
  access_label text not null default 'External link only',
  review_label text not null default 'Licence check required',
  caution text,
  isbn text[] default '{}',
  doi text,
  subjects text[] default '{}',
  language text[] default '{}',
  region text,
  country text,
  metadata_licence text,
  metadata_json jsonb,
  visible_in_discovery boolean default true,
  review_status text not null default 'provisional',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_synced_at timestamptz
);

create table if not exists public.external_record_sync_logs (
  id uuid primary key default gen_random_uuid(),
  source_id text references public.external_sources (id) on delete set null,
  sync_type text,
  status text,
  message text,
  records_found integer default 0,
  records_saved integer default 0,
  started_at timestamptz default now(),
  completed_at timestamptz
);

create table if not exists public.external_record_rights_reviews (
  id uuid primary key default gen_random_uuid(),
  external_record_id uuid references public.external_records (id) on delete cascade,
  reviewer_id uuid references auth.users (id) on delete set null,
  review_status text,
  rights_label text,
  licence_label text,
  access_label text,
  notes text,
  created_at timestamptz default now()
);

create index if not exists external_records_source_id_idx on public.external_records (source_id);
create index if not exists external_records_title_idx on public.external_records (title);
create index if not exists external_records_doi_idx on public.external_records (doi);
create index if not exists external_records_visible_idx on public.external_records (visible_in_discovery);
create index if not exists external_records_metadata_json_gin_idx on public.external_records using gin (metadata_json jsonb_path_ops);

alter table public.external_sources enable row level security;
alter table public.external_records enable row level security;
alter table public.external_record_sync_logs enable row level security;
alter table public.external_record_rights_reviews enable row level security;

drop policy if exists "external_sources_select_enabled" on public.external_sources;
create policy "external_sources_select_enabled" on public.external_sources
  for select using (enabled = true);

drop policy if exists "external_records_select_visible" on public.external_records;
create policy "external_records_select_visible" on public.external_records
  for select using (visible_in_discovery = true);

comment on table public.external_sources is 'Registry mirror for external OA discovery sources (admin/service writes).';
comment on table public.external_records is 'Cached metadata-only external discovery rows; never store full text.';
comment on column public.external_records.review_status is 'provisional | source_checked | licence_check_required | metadata_reviewed | cultural_review_needed | approved_for_discovery | hidden_from_discovery';
