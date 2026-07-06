-- ============================================================================
-- Decolonising Archive — Slice A critical fixes
--
-- Three problems this migration solves:
--
--   1. The `media_library` table is referenced everywhere in the application
--      code and in migration 0003 (`alter table media_library add rights_note`)
--      but no migration ever ran `create table media_library`. On a fresh
--      database the curator media library page 500s.
--
--   2. The `media-library` Storage bucket the upload route writes to was
--      never created either. (The earlier `archive-media` bucket from
--      0002_media.sql is unused by the current code.)
--
--   3. RLS on `media_links` (from 0003_media_links_and_rights.sql) was
--      `to authenticated using (true)` — so any signed-in Member could
--      attach or detach media↔record links. Tighten to curator+ only.
--
-- Idempotent. Safe to re-run.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. media_library table
-- ----------------------------------------------------------------------------

create table if not exists public.media_library (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  description  text,
  alt_text     text,
  credit       text,
  rights_note  text,
  media_type   text,                  -- image / document / audio / video / other
  file_name    text not null,         -- original upload file name
  file_path    text not null,         -- path inside the media-library bucket
  public_url   text not null,
  mime_type    text,
  file_size    bigint,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- 0003 already added rights_note via `alter table` — guard for either order.
alter table public.media_library
  add column if not exists rights_note text;

create index if not exists media_library_user_idx       on public.media_library (user_id);
create index if not exists media_library_media_type_idx on public.media_library (media_type);
create index if not exists media_library_created_at_idx on public.media_library (created_at desc);

drop trigger if exists media_library_set_updated_at on public.media_library;
create trigger media_library_set_updated_at
  before update on public.media_library
  for each row execute function public.touch_profiles_updated_at();


-- ----------------------------------------------------------------------------
-- 2. RLS on media_library
-- ----------------------------------------------------------------------------

alter table public.media_library enable row level security;

drop policy if exists "media_library: read public"        on public.media_library;
drop policy if exists "media_library: insert curator"     on public.media_library;
drop policy if exists "media_library: update own curator" on public.media_library;
drop policy if exists "media_library: delete own curator" on public.media_library;
drop policy if exists "media_library: admin update"       on public.media_library;
drop policy if exists "media_library: admin delete"       on public.media_library;

-- Anyone (signed-in or not) can read media metadata — the archive is public.
create policy "media_library: read public"
  on public.media_library for select
  using (true);

-- Only curators / admins may insert, and only as themselves.
create policy "media_library: insert curator"
  on public.media_library for insert
  with check (public.is_curator_or_admin() and user_id = auth.uid());

-- Curators may update / delete their OWN media; admins can update / delete any.
create policy "media_library: update own curator"
  on public.media_library for update
  using (public.is_curator_or_admin() and user_id = auth.uid())
  with check (public.is_curator_or_admin() and user_id = auth.uid());

create policy "media_library: admin update"
  on public.media_library for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "media_library: delete own curator"
  on public.media_library for delete
  using (public.is_curator_or_admin() and user_id = auth.uid());

create policy "media_library: admin delete"
  on public.media_library for delete
  using (public.is_admin());


-- ----------------------------------------------------------------------------
-- 3. Tighten media_links RLS (was: any authenticated user)
-- ----------------------------------------------------------------------------

drop policy if exists "media_links: read authenticated"   on public.media_links;
drop policy if exists "media_links: insert authenticated" on public.media_links;
drop policy if exists "media_links: delete authenticated" on public.media_links;
drop policy if exists "media_links: read public"          on public.media_links;
drop policy if exists "media_links: insert curator"       on public.media_links;
drop policy if exists "media_links: update curator"       on public.media_links;
drop policy if exists "media_links: delete curator"       on public.media_links;

-- Reads are fine for anyone (the archive is public; readers may need to know
-- which media is attached to which record).
create policy "media_links: read public"
  on public.media_links for select
  using (true);

create policy "media_links: insert curator"
  on public.media_links for insert
  with check (public.is_curator_or_admin());

create policy "media_links: update curator"
  on public.media_links for update
  using (public.is_curator_or_admin())
  with check (public.is_curator_or_admin());

create policy "media_links: delete curator"
  on public.media_links for delete
  using (public.is_curator_or_admin());


-- ----------------------------------------------------------------------------
-- 4. media-library Storage bucket (the one the upload route actually writes to)
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values ('media-library', 'media-library', true, 104857600)  -- 100 MiB cap
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

drop policy if exists "media-library: public read"    on storage.objects;
drop policy if exists "media-library: curator insert" on storage.objects;
drop policy if exists "media-library: curator update" on storage.objects;
drop policy if exists "media-library: curator delete" on storage.objects;

create policy "media-library: public read"
  on storage.objects for select
  using (bucket_id = 'media-library');

create policy "media-library: curator insert"
  on storage.objects for insert
  with check (bucket_id = 'media-library' and public.is_curator_or_admin());

create policy "media-library: curator update"
  on storage.objects for update
  using (bucket_id = 'media-library' and public.is_curator_or_admin())
  with check (bucket_id = 'media-library' and public.is_curator_or_admin());

create policy "media-library: curator delete"
  on storage.objects for delete
  using (bucket_id = 'media-library' and public.is_curator_or_admin());
