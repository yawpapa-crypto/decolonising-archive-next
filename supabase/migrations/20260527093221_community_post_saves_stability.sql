-- Ensure the Community Reading Commons Save action has a stable backing table.
-- This migration intentionally follows the canonical community_comments model
-- used by the application and does not introduce a parallel comments table.

create table if not exists public.community_post_saves (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint community_post_saves_unique unique (post_id, user_id)
);

create index if not exists community_post_saves_post_id_idx
  on public.community_post_saves (post_id);

create index if not exists community_post_saves_user_id_idx
  on public.community_post_saves (user_id, created_at desc);

alter table public.community_post_saves enable row level security;

drop policy if exists "community_post_saves: owner read own" on public.community_post_saves;
drop policy if exists "community_post_saves: authenticated insert visible post" on public.community_post_saves;
drop policy if exists "community_post_saves: owner delete own" on public.community_post_saves;
drop policy if exists "community_post_saves: admin manage" on public.community_post_saves;

create policy "community_post_saves: owner read own"
  on public.community_post_saves for select
  using (auth.uid() = user_id or public.is_admin());

create policy "community_post_saves: authenticated insert visible post"
  on public.community_post_saves for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.community_posts post
      where post.id = community_post_saves.post_id
        and post.status = 'published'
        and post.visibility in ('public', 'community')
    )
  );

create policy "community_post_saves: owner delete own"
  on public.community_post_saves for delete
  using (auth.uid() = user_id);

create policy "community_post_saves: admin manage"
  on public.community_post_saves for all
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, delete on public.community_post_saves to authenticated;

notify pgrst, 'reload schema';
