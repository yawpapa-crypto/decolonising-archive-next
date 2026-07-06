-- Community Reading Commons: restrained post reactions and post type metadata.

alter table public.community_posts
  add column if not exists post_type text not null default 'reflection';

update public.community_posts
set post_type = 'reflection'
where post_type is null
  or post_type not in ('reflection', 'source_note', 'reading_list', 'question', 'teaching_path');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'community_posts_post_type_check'
      and conrelid = 'public.community_posts'::regclass
  ) then
    alter table public.community_posts
      add constraint community_posts_post_type_check
      check (post_type in ('reflection', 'source_note', 'reading_list', 'question', 'teaching_path'));
  end if;
end;
$$;

create table if not exists public.community_post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction_type text not null default 'useful',
  created_at timestamptz not null default now(),
  constraint community_post_reactions_type_check check (reaction_type in ('useful')),
  constraint community_post_reactions_unique unique (post_id, user_id, reaction_type)
);

create index if not exists community_post_reactions_post_idx
  on public.community_post_reactions (post_id, reaction_type);

create index if not exists community_post_reactions_user_idx
  on public.community_post_reactions (user_id, created_at desc);

alter table public.community_post_reactions enable row level security;

drop policy if exists "community_post_reactions: read visible post reactions" on public.community_post_reactions;
drop policy if exists "community_post_reactions: owner admin read" on public.community_post_reactions;
drop policy if exists "community_post_reactions: authenticated insert visible post" on public.community_post_reactions;
drop policy if exists "community_post_reactions: owner delete own" on public.community_post_reactions;
drop policy if exists "community_post_reactions: admin manage" on public.community_post_reactions;

create policy "community_post_reactions: read visible post reactions"
  on public.community_post_reactions for select
  using (
    exists (
      select 1 from public.community_posts post
      where post.id = community_post_reactions.post_id
        and post.status = 'published'
        and post.visibility in ('public', 'community')
    )
  );

create policy "community_post_reactions: owner admin read"
  on public.community_post_reactions for select
  using (auth.uid() = user_id or public.is_admin());

create policy "community_post_reactions: authenticated insert visible post"
  on public.community_post_reactions for insert
  with check (
    auth.uid() = user_id
    and reaction_type = 'useful'
    and exists (
      select 1 from public.community_posts post
      where post.id = community_post_reactions.post_id
        and post.status = 'published'
        and post.visibility in ('public', 'community')
    )
  );

create policy "community_post_reactions: owner delete own"
  on public.community_post_reactions for delete
  using (auth.uid() = user_id);

create policy "community_post_reactions: admin manage"
  on public.community_post_reactions for all
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.community_post_reactions to anon, authenticated;
grant insert, delete on public.community_post_reactions to authenticated;

notify pgrst, 'reload schema';
