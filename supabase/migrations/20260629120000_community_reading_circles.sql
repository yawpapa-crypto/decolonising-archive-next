-- Reading Circles: Circle-inspired spaces for grouped community discussion.

create table if not exists public.community_spaces (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  emoji text not null default '📖',
  visibility text not null default 'public',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_spaces_slug_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint community_spaces_visibility_check check (visibility in ('public', 'community')),
  constraint community_spaces_name_length check (char_length(trim(name)) between 2 and 80)
);

create table if not exists public.community_space_members (
  space_id uuid not null references public.community_spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (space_id, user_id),
  constraint community_space_members_role_check check (role in ('member', 'moderator'))
);

alter table public.community_posts
  add column if not exists space_id uuid references public.community_spaces(id) on delete set null;

create index if not exists community_posts_space_idx
  on public.community_posts (space_id, status, last_activity_at desc)
  where space_id is not null;

create index if not exists community_space_members_user_idx
  on public.community_space_members (user_id, joined_at desc);

create index if not exists community_spaces_visibility_idx
  on public.community_spaces (visibility, name asc);

drop trigger if exists community_spaces_touch_updated_at on public.community_spaces;
create trigger community_spaces_touch_updated_at
  before update on public.community_spaces
  for each row execute function public.touch_community_updated_at();

alter table public.community_spaces enable row level security;
alter table public.community_space_members enable row level security;

drop policy if exists "community_spaces: public read" on public.community_spaces;
drop policy if exists "community_spaces: authenticated insert" on public.community_spaces;
drop policy if exists "community_spaces: creator admin update" on public.community_spaces;
drop policy if exists "community_spaces: admin delete" on public.community_spaces;

create policy "community_spaces: public read"
  on public.community_spaces for select
  using (visibility in ('public', 'community'));

create policy "community_spaces: authenticated insert"
  on public.community_spaces for insert
  with check (auth.uid() = created_by and visibility in ('public', 'community'));

create policy "community_spaces: creator admin update"
  on public.community_spaces for update
  using (auth.uid() = created_by or public.is_admin())
  with check (auth.uid() = created_by or public.is_admin());

create policy "community_spaces: admin delete"
  on public.community_spaces for delete
  using (public.is_admin());

drop policy if exists "community_space_members: public read" on public.community_space_members;
drop policy if exists "community_space_members: insert own" on public.community_space_members;
drop policy if exists "community_space_members: delete own" on public.community_space_members;

create policy "community_space_members: public read"
  on public.community_space_members for select
  using (true);

create policy "community_space_members: insert own"
  on public.community_space_members for insert
  with check (auth.uid() = user_id);

create policy "community_space_members: delete own"
  on public.community_space_members for delete
  using (auth.uid() = user_id or public.is_admin());

insert into public.community_spaces (slug, name, description, emoji, visibility)
values
  (
    'welcome',
    'Welcome & introductions',
    'Say hello, share what you are reading, and find collaborators in the archive.',
    '👋',
    'public'
  ),
  (
    'oral-histories',
    'Oral histories & memory',
    'Threads on testimony, voice, memory work, and careful listening.',
    '🎙️',
    'public'
  ),
  (
    'land-place',
    'Land, place & sovereignty',
    'Reading with Country, place-names, mapping, and sovereignty in the archive.',
    '🌿',
    'public'
  ),
  (
    'pedagogy',
    'Pedagogy & teaching',
    'Teaching paths, syllabus sharing, and classroom use of decolonial sources.',
    '📚',
    'public'
  ),
  (
    'archives-methods',
    'Archives & knowledge systems',
    'Provenance, cataloguing, gaps, and how colonial archives shape what we can read.',
    '🗂️',
    'public'
  ),
  (
    'research-methods',
    'Research methods',
    'Citation practice, uncertainty, collaboration, and reading with care.',
    '🔍',
    'public'
  )
on conflict (slug) do nothing;
