alter table public.media_library
  add column if not exists rights_note text;

create table if not exists public.media_links (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null references public.media_library(id) on delete cascade,
  target_type text not null,
  target_id text not null,
  relation_type text not null default 'attachment',
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists media_links_target_idx
  on public.media_links (target_type, target_id);

create index if not exists media_links_media_idx
  on public.media_links (media_id);

alter table public.media_links enable row level security;

drop policy if exists "media_links: read authenticated" on public.media_links;
create policy "media_links: read authenticated"
  on public.media_links for select
  to authenticated
  using (true);

drop policy if exists "media_links: insert authenticated" on public.media_links;
create policy "media_links: insert authenticated"
  on public.media_links for insert
  to authenticated
  with check (true);

drop policy if exists "media_links: delete authenticated" on public.media_links;
create policy "media_links: delete authenticated"
  on public.media_links for delete
  to authenticated
  using (true);
