-- ============================================================================
-- ARED — Ghana Graphic Design History public research catalogue
-- Migration 0040
-- Build: 2026-07-05-taxonomy-v1
-- ============================================================================

do $$ begin
  if not exists (select 1 from pg_type where typname = 'catalogue_evidence_status') then
    create type public.catalogue_evidence_status as enum (
      'unverified',
      'research_lead',
      'source_located',
      'source_checked',
      'partially_verified',
      'verified',
      'disputed',
      'community_review_required',
      'rights_review_required'
    );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'source_authority_level') then
    create type public.source_authority_level as enum (
      'tier_1',
      'tier_2',
      'tier_3',
      'tier_4'
    );
  end if;
end $$;

-- ── catalogue_taxonomy ─────────────────────────────────────────────────────

create table if not exists public.catalogue_taxonomy (
  id              bigserial primary key,
  build_id        text not null,
  taxonomy_type   text not null,
  code            text not null,
  label           text not null,
  definition      text,
  unique (build_id, taxonomy_type, code)
);

-- ── catalogue_source_registry ────────────────────────────────────────────────

create table if not exists public.catalogue_source_registry (
  id                    bigserial primary key,
  build_id              text not null,
  source_name           text not null,
  source_url            text not null,
  source_type           text,
  records_using_source  integer not null default 0,
  unique (build_id, source_name, source_url)
);

-- ── catalogue_records ────────────────────────────────────────────────────────

create table if not exists public.catalogue_records (
  id                          text primary key,
  build_id                    text not null default '2026-07-05-taxonomy-v1',
  import_status               text,
  publication_state           text,
  title                       text not null,
  record_type                 text,
  period_id                   text,
  period_label                text,
  date_start                  text,
  date_end                    text,
  visual_system_id            text,
  visual_system_label         text,
  region                      text,
  locality                    text,
  community_or_culture        text,
  creator_or_authority        text,
  creator_role                text,
  institution_or_collection   text,
  object_or_record_type       text,
  medium_or_format            text,
  language                    text,
  description                 text not null default '',
  historical_significance     text,
  source_name                 text,
  source_url                  text,
  secondary_source_url        text,
  source_type                 text,
  rights_status               text,
  rights_note                 text,
  research_priority           text,
  research_question           text,
  provenance_or_custody_note  text,
  community_authority_required boolean not null default false,
  linked_record_ids           text[] not null default '{}',
  tags                        text[] not null default '{}',
  current_research_area       text,
  what_remains_to_be_established text,
  public_visibility           boolean not null default true,
  evidence_status             public.catalogue_evidence_status not null default 'research_lead',
  raw_csv_row                 jsonb not null default '{}',
  imported_at                 timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index if not exists catalogue_records_evidence_status_idx
  on public.catalogue_records (evidence_status);
create index if not exists catalogue_records_period_idx
  on public.catalogue_records (period_id);
create index if not exists catalogue_records_visual_system_idx
  on public.catalogue_records (visual_system_id);
create index if not exists catalogue_records_region_idx
  on public.catalogue_records (region);
create index if not exists catalogue_records_build_idx
  on public.catalogue_records (build_id);

-- ── catalogue_verification ───────────────────────────────────────────────────

create table if not exists public.catalogue_verification (
  id                                  text primary key,
  catalogue_record_id                 text not null references public.catalogue_records(id) on delete cascade,
  evidence_status                     public.catalogue_evidence_status not null,
  checked_by                          text,
  checked_at                          timestamptz,
  primary_source_url                  text,
  secondary_source_url                text,
  source_type                         text,
  source_authority_level              public.source_authority_level,
  source_supports_title               boolean,
  source_supports_creator             boolean,
  source_supports_date                boolean,
  source_supports_location            boolean,
  source_supports_description         boolean,
  source_supports_historical_significance boolean,
  rights_checked                      boolean not null default false,
  provenance_checked                  boolean not null default false,
  community_authority_checked         boolean not null default false,
  conflicting_evidence                text,
  verification_notes                  text,
  unresolved_questions                text,
  verification_decision               text,
  unique (catalogue_record_id)
);

-- ── catalogue_evidence ───────────────────────────────────────────────────────

create table if not exists public.catalogue_evidence (
  id                  text primary key,
  catalogue_record_id text not null references public.catalogue_records(id) on delete cascade,
  source_title        text,
  source_author      text,
  source_institution  text,
  source_url          text,
  source_type         text,
  publication_date    text,
  access_date         text,
  quoted_evidence     text,
  paraphrased_evidence text,
  claim_supported     text,
  reliability_level   public.source_authority_level,
  archived_url        text,
  notes               text,
  created_at          timestamptz not null default now()
);

create index if not exists catalogue_evidence_record_idx
  on public.catalogue_evidence (catalogue_record_id);

-- ── catalogue_verification_tasks ─────────────────────────────────────────────

create table if not exists public.catalogue_verification_tasks (
  id                  bigserial primary key,
  catalogue_record_id text not null references public.catalogue_records(id) on delete cascade,
  task_type           text not null,
  description         text not null,
  status              text not null default 'open',
  created_at          timestamptz not null default now(),
  resolved_at         timestamptz
);

-- ── RLS: public read for visible records ─────────────────────────────────────

alter table public.catalogue_records enable row level security;
alter table public.catalogue_verification enable row level security;
alter table public.catalogue_evidence enable row level security;
alter table public.catalogue_taxonomy enable row level security;
alter table public.catalogue_source_registry enable row level security;

drop policy if exists catalogue_records_public_read on public.catalogue_records;
create policy catalogue_records_public_read on public.catalogue_records
  for select using (public_visibility = true);

drop policy if exists catalogue_verification_public_read on public.catalogue_verification;
create policy catalogue_verification_public_read on public.catalogue_verification
  for select using (true);

drop policy if exists catalogue_evidence_public_read on public.catalogue_evidence;
create policy catalogue_evidence_public_read on public.catalogue_evidence
  for select using (true);

drop policy if exists catalogue_taxonomy_public_read on public.catalogue_taxonomy;
create policy catalogue_taxonomy_public_read on public.catalogue_taxonomy
  for select using (true);

drop policy if exists catalogue_source_registry_public_read on public.catalogue_source_registry;
create policy catalogue_source_registry_public_read on public.catalogue_source_registry
  for select using (true);
