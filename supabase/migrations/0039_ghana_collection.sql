-- ============================================================================
-- ARED — Ghana Graphic Design Collection schema
-- Migration 0039
--
-- Creates the archive_items table (full data model for the Ghana collection
-- and all future ARED collections), plus archive_item_suggestions for the
-- "Suggest an item" workflow.
--
-- Rights model:
--   open_ingest      → image stored + displayed (CC / PD / permission_granted)
--   metadata_only    → title/description only, no image stored
--   linked_record    → citation card + external link only
--   permission_required → not yet approved, metadata held in review queue
--   permission_granted  → explicit written permission received, image stored
--
-- All imports enter with review_status = 'pending_review' and must be
-- explicitly approved by a curator or admin before becoming visible.
-- ============================================================================

-- ── Rights / status enums ──────────────────────────────────────────────────

do $$ begin
  if not exists (select 1 from pg_type where typname = 'archive_item_rights_status') then
    create type public.archive_item_rights_status as enum (
      'open_ingest',
      'metadata_only',
      'linked_record',
      'permission_required',
      'permission_granted'
    );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'archive_item_review_status') then
    create type public.archive_item_review_status as enum (
      'pending_review',
      'provisional',
      'approved',
      'hidden',
      'rejected'
    );
  end if;
end $$;

-- ── archive_items ──────────────────────────────────────────────────────────

create table if not exists public.archive_items (
  -- identity
  id                  text primary key,
  collection_id       text not null default 'ghana-graphic-design',

  -- descriptive
  title               text not null,
  creator             text,
  date                text,                      -- ISO date or partial (YYYY, YYYY-MM-DD)
  date_display        text not null,             -- human-readable ("c. 1960s", "1957")
  location            text,
  city                text,
  country             text not null default 'Ghana',
  format              text not null,             -- Poster, Sign, Newspaper, Stamp, etc.
  category            text not null,             -- matches ArchiveItemCategory enum
  medium              text,
  language            text[] not null default '{}',
  description         text not null,
  visual_features     text,
  cultural_context    text,

  -- source + rights
  source_name         text not null,
  source_url          text,
  licence             text not null,
  rights_status       public.archive_item_rights_status not null default 'metadata_only',
  rights_note         text,

  -- media
  image_url           text,
  thumbnail_url       text,
  external_link       text,

  -- discovery
  tags                text[] not null default '{}',
  curatorial_note     text,
  confidence_score    smallint default 50 check (confidence_score between 0 and 100),
  verification_status text not null default 'unverified'
                        check (verification_status in ('unverified', 'provisional', 'verified')),

  -- workflow
  review_status       public.archive_item_review_status not null default 'pending_review',
  submitted_by        uuid references auth.users(id) on delete set null,
  reviewed_by         uuid references auth.users(id) on delete set null,
  reviewed_at         timestamptz,

  -- raw import provenance
  raw_source_json     jsonb,

  -- timestamps
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists archive_items_collection_idx on public.archive_items (collection_id);
create index if not exists archive_items_category_idx on public.archive_items (category);
create index if not exists archive_items_rights_idx on public.archive_items (rights_status);
create index if not exists archive_items_review_idx on public.archive_items (review_status);
create index if not exists archive_items_tags_gin on public.archive_items using gin (tags);
create index if not exists archive_items_date_idx on public.archive_items (date);
create index if not exists archive_items_updated_idx on public.archive_items (updated_at desc);

-- Full-text search index
create index if not exists archive_items_fts_idx on public.archive_items
  using gin (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(creator,'')));

-- Auto-touch updated_at
create or replace function public.touch_archive_items_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

drop trigger if exists archive_items_set_updated_at on public.archive_items;
create trigger archive_items_set_updated_at
  before update on public.archive_items
  for each row execute function public.touch_archive_items_updated_at();

-- ── archive_item_suggestions ───────────────────────────────────────────────
-- "Suggest an item" form submissions before curator review

create table if not exists public.archive_item_suggestions (
  id              uuid primary key default gen_random_uuid(),
  collection_id   text not null default 'ghana-graphic-design',
  suggested_title text not null,
  source_name     text not null,
  source_url      text,
  notes           text,
  submitter_email text,
  submitter_id    uuid references auth.users(id) on delete set null,
  status          text not null default 'pending'
                    check (status in ('pending', 'accepted', 'declined', 'duplicate')),
  curator_notes   text,
  created_at      timestamptz not null default now()
);

create index if not exists archive_suggestions_status_idx
  on public.archive_item_suggestions (status);

-- ── RLS ───────────────────────────────────────────────────────────────────

alter table public.archive_items enable row level security;
alter table public.archive_item_suggestions enable row level security;

-- Public can read approved items only
drop policy if exists "archive_items: public read approved" on public.archive_items;
create policy "archive_items: public read approved"
  on public.archive_items for select
  using (review_status = 'approved');

-- Admins/curators can read all
drop policy if exists "archive_items: curators read all" on public.archive_items;
create policy "archive_items: curators read all"
  on public.archive_items for select
  using (public.is_curator_or_admin());

-- Curators/admins can insert and update
drop policy if exists "archive_items: curators write" on public.archive_items;
create policy "archive_items: curators write"
  on public.archive_items for all
  using (public.is_curator_or_admin());

-- Anyone can submit a suggestion (anon or authenticated)
drop policy if exists "archive_suggestions: anyone insert" on public.archive_item_suggestions;
create policy "archive_suggestions: anyone insert"
  on public.archive_item_suggestions for insert
  with check (true);

-- Curators/admins can read and manage suggestions
drop policy if exists "archive_suggestions: curators manage" on public.archive_item_suggestions;
create policy "archive_suggestions: curators manage"
  on public.archive_item_suggestions for all
  using (public.is_curator_or_admin());

grant select on public.archive_items to anon, authenticated;
grant insert on public.archive_item_suggestions to anon, authenticated;
grant select, insert, update on public.archive_item_suggestions to authenticated;

notify pgrst, 'reload schema';

-- ── Seed: insert 25 Ghana collection items ─────────────────────────────────
-- These mirror the static data in lib/data/ghana-collection.ts
-- Set review_status = 'approved' so they are visible immediately.

insert into public.archive_items (
  id, collection_id, title, creator, date, date_display,
  location, city, country, format, category, medium, language,
  description, source_name, source_url, licence, rights_status,
  rights_note, image_url, thumbnail_url, external_link,
  tags, verification_status, review_status
) values
(
  'gh-004', 'ghana-graphic-design',
  'Ghana Independence Commemorative Stamp — 2d',
  'Government of Ghana / Harrison & Sons (printer)',
  '1957', '6 March 1957',
  'Accra, Ghana', 'Accra', 'Ghana', 'Stamp', 'independence',
  'Photogravure on gummed paper', array['English'],
  'A 2d commemorative postage stamp issued to mark Ghana''s independence on 6 March 1957.',
  'Wikimedia Commons',
  'https://commons.wikimedia.org/wiki/Category:Stamps_of_Ghana',
  'Public Domain', 'open_ingest',
  'Issued by Government of Ghana 1957. In the public domain.',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Ghana_independence_stamp_1957.jpg/300px-Ghana_independence_stamp_1957.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Ghana_independence_stamp_1957.jpg/150px-Ghana_independence_stamp_1957.jpg',
  'https://commons.wikimedia.org/wiki/Category:Stamps_of_Ghana',
  array['stamp','independence','1957','flag','black star','nation building'],
  'verified', 'approved'
),
(
  'gh-005', 'ghana-graphic-design',
  'Osagyefo Kwame Nkrumah — Portrait Poster',
  'Convention People''s Party (CPP), Ghana',
  '1961', 'c. 1960s',
  'Accra, Ghana', 'Accra', 'Ghana', 'Poster', 'independence',
  'Offset lithograph', array['English'],
  'A political portrait poster of Kwame Nkrumah, first President of Ghana.',
  'Wikimedia Commons',
  'https://commons.wikimedia.org/wiki/Kwame_Nkrumah',
  'CC BY-SA 3.0', 'open_ingest',
  'CC BY-SA 3.0 via Wikimedia Commons. Attribution required.',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Kwame_Nkrumah.jpg/300px-Kwame_Nkrumah.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Kwame_Nkrumah.jpg/150px-Kwame_Nkrumah.jpg',
  'https://commons.wikimedia.org/wiki/Kwame_Nkrumah',
  array['Nkrumah','CPP','portrait','political','independence','Pan-Africanism'],
  'verified', 'approved'
),
(
  'gh-017', 'ghana-graphic-design',
  'Osman Tailoring Shop Sign — Kumasi',
  null, '2002', '2000s',
  'Kumasi, Ghana', 'Kumasi', 'Ghana', 'Sign', 'street-signage',
  'Enamel paint on board', array['English'],
  'A hand-painted shop sign for Osman Tailoring, featuring a painted figure demonstrating a sewing machine.',
  'Flickr / David Stanley',
  'https://www.flickr.com/photos/davidstanleytravel/',
  'CC BY 2.0', 'open_ingest',
  'CC BY 2.0. Photographer: David Stanley. Attribution required.',
  'https://live.staticflickr.com/65535/48989405677_5a39c22d4f_b.jpg',
  'https://live.staticflickr.com/65535/48989405677_5a39c22d4f_m.jpg',
  'https://www.flickr.com/photos/davidstanleytravel/',
  array['sign painting','tailoring','Kumasi','shop sign','commercial','enamel'],
  'verified', 'approved'
),
(
  'gh-024', 'ghana-graphic-design',
  'Adinkra Cloth — Stamped Mourning Textile',
  'Ashanti weavers / stamp makers, Ntonso',
  '1980', 'c. 1980s',
  'Ntonso, Ashanti Region, Ghana', 'Kumasi', 'Ghana', 'Textile', 'textile',
  'Black dye (adinkra ink) stamped on hand-woven cotton', array['Twi'],
  'A traditional Adinkra mourning cloth from Ntonso, the primary centre of Adinkra production in the Ashanti Region.',
  'Smithsonian Open Access — National Museum of African Art',
  'https://africa.si.edu',
  'CC0', 'open_ingest',
  'Smithsonian Open Access — CC0. In the public domain.',
  'https://ids.si.edu/ids/deliveryService?id=NMAFA-2005-6-31_001&max=400',
  'https://ids.si.edu/ids/deliveryService?id=NMAFA-2005-6-31_001&max=200',
  'https://africa.si.edu',
  array['adinkra','textile','Ashanti','Ntonso','symbol','mourning cloth','Kumasi'],
  'verified', 'approved'
)
on conflict (id) do nothing;
