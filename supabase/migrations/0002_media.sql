-- ============================================================================
-- Decolonising Archive — Phase 2: Curator media library
--
-- Standalone media library:
--   * Curators (and Admins) can upload audio / video / pdf / image files.
--   * Members and Public can read all "ready" media (the archive is public).
--   * Files live in a single Storage bucket `archive-media` with one folder
--     per kind. The `media` table is the metadata index.
--
-- Apply via Supabase SQL editor or `supabase db push`. Idempotent.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. media kind + status enums
-- ----------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'archive_media_kind') then
    create type public.archive_media_kind as enum ('image', 'pdf', 'audio', 'video');
  end if;
  if not exists (select 1 from pg_type where typname = 'archive_media_status') then
    create type public.archive_media_status as enum ('pending', 'ready', 'failed');
  end if;
end $$;


-- ----------------------------------------------------------------------------
-- 2. media table
-- ----------------------------------------------------------------------------

create table if not exists public.media (
  id            uuid primary key default gen_random_uuid(),
  kind          public.archive_media_kind   not null,
  status        public.archive_media_status not null default 'pending',
  title         text not null,
  description   text,
  file_path     text not null unique,           -- path inside the archive-media bucket
  mime_type     text not null,
  size_bytes    bigint not null check (size_bytes > 0),
  uploaded_by   uuid not null references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists media_kind_idx       on public.media (kind);
create index if not exists media_status_idx     on public.media (status);
create index if not exists media_uploaded_by_idx on public.media (uploaded_by);
create index if not exists media_created_at_idx on public.media (created_at desc);

drop trigger if exists media_set_updated_at on public.media;
create trigger media_set_updated_at
  before update on public.media
  for each row execute function public.touch_profiles_updated_at();


-- ----------------------------------------------------------------------------
-- 3. Row Level Security on media
-- ----------------------------------------------------------------------------

alter table public.media enable row level security;

drop policy if exists "media: read ready (public)" on public.media;
drop policy if exists "media: read all (curator)"  on public.media;
drop policy if exists "media: insert (curator)"    on public.media;
drop policy if exists "media: update (curator)"    on public.media;
drop policy if exists "media: delete (curator)"    on public.media;

-- Public can see anything that's marked ready (archive is public).
create policy "media: read ready (public)"
  on public.media for select
  using (status = 'ready');

-- Curators / Admins additionally see pending / failed items.
create policy "media: read all (curator)"
  on public.media for select
  using (public.is_curator_or_admin());

create policy "media: insert (curator)"
  on public.media for insert
  with check (public.is_curator_or_admin() and uploaded_by = auth.uid());

create policy "media: update (curator)"
  on public.media for update
  using (public.is_curator_or_admin())
  with check (public.is_curator_or_admin());

create policy "media: delete (curator)"
  on public.media for delete
  using (public.is_curator_or_admin());


-- ----------------------------------------------------------------------------
-- 4. Storage bucket + policies
-- ----------------------------------------------------------------------------

-- Create the bucket (public read, no per-bucket size limit — we enforce
-- per-kind caps in the route handler since Storage only supports a single
-- bucket-wide limit). Idempotent via on conflict.
insert into storage.buckets (id, name, public, file_size_limit)
values ('archive-media', 'archive-media', true, 104857600)  -- 100 MiB cap on the bucket
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

-- Storage policies live on storage.objects (RLS already enabled by Supabase).
drop policy if exists "archive-media: public read"        on storage.objects;
drop policy if exists "archive-media: curator insert"     on storage.objects;
drop policy if exists "archive-media: curator update"     on storage.objects;
drop policy if exists "archive-media: curator delete"     on storage.objects;

create policy "archive-media: public read"
  on storage.objects for select
  using (bucket_id = 'archive-media');

create policy "archive-media: curator insert"
  on storage.objects for insert
  with check (bucket_id = 'archive-media' and public.is_curator_or_admin());

create policy "archive-media: curator update"
  on storage.objects for update
  using (bucket_id = 'archive-media' and public.is_curator_or_admin())
  with check (bucket_id = 'archive-media' and public.is_curator_or_admin());

create policy "archive-media: curator delete"
  on storage.objects for delete
  using (bucket_id = 'archive-media' and public.is_curator_or_admin());
