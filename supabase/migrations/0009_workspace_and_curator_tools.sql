-- ============================================================================
-- Workspace + curator tools
-- ============================================================================

create table if not exists public.curator_dossiers (
  id          uuid primary key default gen_random_uuid(),
  curator_id  uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  summary     text,
  status      text not null default 'draft' check (status in ('draft', 'review', 'published')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists curator_dossiers_curator_idx
  on public.curator_dossiers (curator_id, created_at desc);

drop trigger if exists curator_dossiers_set_updated_at on public.curator_dossiers;
create trigger curator_dossiers_set_updated_at
  before update on public.curator_dossiers
  for each row execute function public.touch_profiles_updated_at();


create table if not exists public.archive_notes (
  id          uuid primary key default gen_random_uuid(),
  curator_id  uuid not null references auth.users(id) on delete cascade,
  record_id   text,
  title       text not null,
  note        text not null,
  status      text not null default 'draft' check (status in ('draft', 'review', 'published')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists archive_notes_curator_idx
  on public.archive_notes (curator_id, created_at desc);

drop trigger if exists archive_notes_set_updated_at on public.archive_notes;
create trigger archive_notes_set_updated_at
  before update on public.archive_notes
  for each row execute function public.touch_profiles_updated_at();


create table if not exists public.featured_records (
  id          uuid primary key default gen_random_uuid(),
  curator_id  uuid not null references auth.users(id) on delete cascade,
  record_id   text not null,
  reason      text,
  placement   text not null default 'homepage' check (placement in ('homepage', 'library', 'pathway')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (record_id, placement)
);

create index if not exists featured_records_active_idx
  on public.featured_records (is_active, placement, created_at desc);


create table if not exists public.themed_pathways (
  id          uuid primary key default gen_random_uuid(),
  curator_id  uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  theme       text not null,
  description text,
  status      text not null default 'draft' check (status in ('draft', 'review', 'published')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists themed_pathways_curator_idx
  on public.themed_pathways (curator_id, created_at desc);

drop trigger if exists themed_pathways_set_updated_at on public.themed_pathways;
create trigger themed_pathways_set_updated_at
  before update on public.themed_pathways
  for each row execute function public.touch_profiles_updated_at();


create table if not exists public.submitted_content (
  id             uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  title           text not null,
  content_type    text not null default 'record' check (content_type in ('record', 'source', 'correction', 'community_note')),
  description     text not null,
  source_url      text,
  review_status   text not null default 'submitted' check (review_status in ('submitted', 'in_review', 'accepted', 'declined')),
  reviewer_id     uuid references auth.users(id) on delete set null,
  reviewer_note   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists submitted_content_status_idx
  on public.submitted_content (review_status, created_at desc);

create index if not exists submitted_content_user_idx
  on public.submitted_content (user_id, created_at desc);

drop trigger if exists submitted_content_set_updated_at on public.submitted_content;
create trigger submitted_content_set_updated_at
  before update on public.submitted_content
  for each row execute function public.touch_profiles_updated_at();


alter table public.curator_dossiers enable row level security;
alter table public.archive_notes enable row level security;
alter table public.featured_records enable row level security;
alter table public.themed_pathways enable row level security;
alter table public.submitted_content enable row level security;

-- curator_dossiers ------------------------------------------------------
drop policy if exists "curator_dossiers: curator read" on public.curator_dossiers;
drop policy if exists "curator_dossiers: curator insert" on public.curator_dossiers;
drop policy if exists "curator_dossiers: owner update" on public.curator_dossiers;
drop policy if exists "curator_dossiers: owner delete" on public.curator_dossiers;

create policy "curator_dossiers: curator read"
  on public.curator_dossiers for select
  using (public.is_curator_or_admin());

create policy "curator_dossiers: curator insert"
  on public.curator_dossiers for insert
  with check (public.is_curator_or_admin() and auth.uid() = curator_id);

create policy "curator_dossiers: owner update"
  on public.curator_dossiers for update
  using (public.is_curator_or_admin() and (auth.uid() = curator_id or public.is_admin()))
  with check (public.is_curator_or_admin());

create policy "curator_dossiers: owner delete"
  on public.curator_dossiers for delete
  using (public.is_curator_or_admin() and (auth.uid() = curator_id or public.is_admin()));

-- archive_notes ---------------------------------------------------------
drop policy if exists "archive_notes: curator read" on public.archive_notes;
drop policy if exists "archive_notes: curator insert" on public.archive_notes;
drop policy if exists "archive_notes: owner update" on public.archive_notes;
drop policy if exists "archive_notes: owner delete" on public.archive_notes;

create policy "archive_notes: curator read"
  on public.archive_notes for select
  using (public.is_curator_or_admin());

create policy "archive_notes: curator insert"
  on public.archive_notes for insert
  with check (public.is_curator_or_admin() and auth.uid() = curator_id);

create policy "archive_notes: owner update"
  on public.archive_notes for update
  using (public.is_curator_or_admin() and (auth.uid() = curator_id or public.is_admin()))
  with check (public.is_curator_or_admin());

create policy "archive_notes: owner delete"
  on public.archive_notes for delete
  using (public.is_curator_or_admin() and (auth.uid() = curator_id or public.is_admin()));

-- featured_records ------------------------------------------------------
drop policy if exists "featured_records: curator read" on public.featured_records;
drop policy if exists "featured_records: curator insert" on public.featured_records;
drop policy if exists "featured_records: curator update" on public.featured_records;
drop policy if exists "featured_records: curator delete" on public.featured_records;

create policy "featured_records: curator read"
  on public.featured_records for select
  using (public.is_curator_or_admin());

create policy "featured_records: curator insert"
  on public.featured_records for insert
  with check (public.is_curator_or_admin() and auth.uid() = curator_id);

create policy "featured_records: curator update"
  on public.featured_records for update
  using (public.is_curator_or_admin())
  with check (public.is_curator_or_admin());

create policy "featured_records: curator delete"
  on public.featured_records for delete
  using (public.is_curator_or_admin());

-- themed_pathways -------------------------------------------------------
drop policy if exists "themed_pathways: curator read" on public.themed_pathways;
drop policy if exists "themed_pathways: curator insert" on public.themed_pathways;
drop policy if exists "themed_pathways: owner update" on public.themed_pathways;
drop policy if exists "themed_pathways: owner delete" on public.themed_pathways;

create policy "themed_pathways: curator read"
  on public.themed_pathways for select
  using (public.is_curator_or_admin());

create policy "themed_pathways: curator insert"
  on public.themed_pathways for insert
  with check (public.is_curator_or_admin() and auth.uid() = curator_id);

create policy "themed_pathways: owner update"
  on public.themed_pathways for update
  using (public.is_curator_or_admin() and (auth.uid() = curator_id or public.is_admin()))
  with check (public.is_curator_or_admin());

create policy "themed_pathways: owner delete"
  on public.themed_pathways for delete
  using (public.is_curator_or_admin() and (auth.uid() = curator_id or public.is_admin()));

-- submitted_content -----------------------------------------------------
drop policy if exists "submitted_content: read own or curator" on public.submitted_content;
drop policy if exists "submitted_content: member insert" on public.submitted_content;
drop policy if exists "submitted_content: owner update draft" on public.submitted_content;
drop policy if exists "submitted_content: curator update" on public.submitted_content;
drop policy if exists "submitted_content: owner delete" on public.submitted_content;

create policy "submitted_content: read own or curator"
  on public.submitted_content for select
  using (auth.uid() = user_id or public.is_curator_or_admin());

create policy "submitted_content: member insert"
  on public.submitted_content for insert
  with check (auth.uid() = user_id);

create policy "submitted_content: owner update draft"
  on public.submitted_content for update
  using (auth.uid() = user_id and review_status = 'submitted')
  with check (auth.uid() = user_id and review_status = 'submitted');

create policy "submitted_content: curator update"
  on public.submitted_content for update
  using (public.is_curator_or_admin())
  with check (public.is_curator_or_admin());

create policy "submitted_content: owner delete"
  on public.submitted_content for delete
  using (auth.uid() = user_id and review_status = 'submitted');
