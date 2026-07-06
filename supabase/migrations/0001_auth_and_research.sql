-- ============================================================================
-- Decolonising Archive — Phase 1 auth + research schema
--
-- Roles: member  → curator → admin (strict hierarchy).
--
-- Members are self-served via supabase.auth.signUp (always created with
-- role = 'member' by the on_auth_user_created trigger). Curator and Admin
-- are promoted manually by an Admin from the dashboard — never selectable
-- by the user themselves.
--
-- Run order: this migration is idempotent on the schema-creation parts but
-- drops/replaces existing policies. Apply via:
--
--   supabase db push       -- if you use the Supabase CLI
-- or paste into the Supabase SQL editor.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Role enum
-- ----------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'archive_role') then
    create type public.archive_role as enum ('member', 'curator', 'admin');
  end if;
end $$;


-- ----------------------------------------------------------------------------
-- 2. profiles (1:1 with auth.users)
-- ----------------------------------------------------------------------------

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  role        public.archive_role not null default 'member',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);

-- Touch updated_at on every change.
create or replace function public.touch_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.touch_profiles_updated_at();


-- ----------------------------------------------------------------------------
-- 3. on_auth_user_created — every new auth.users row gets a profile row,
--    role hard-coded to 'member' (clients can never escalate at signup).
-- ----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', null),
    'member'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ----------------------------------------------------------------------------
-- 4. Helper: is_admin / is_curator_or_admin (used by RLS policies below).
-- ----------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_curator_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('curator', 'admin')
  );
$$;


-- ----------------------------------------------------------------------------
-- 5. Research tables — owned by the user.
-- ----------------------------------------------------------------------------

create table if not exists public.bookmarks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  record_id   text not null,
  note        text,
  created_at  timestamptz not null default now(),
  unique (user_id, record_id)
);

create index if not exists bookmarks_user_idx on public.bookmarks (user_id, created_at desc);


create table if not exists public.saved_searches (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  label       text not null,
  query       text not null,
  filters     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists saved_searches_user_idx on public.saved_searches (user_id, created_at desc);


create table if not exists public.reading_lists (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  description  text,
  is_public    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

drop trigger if exists reading_lists_set_updated_at on public.reading_lists;
create trigger reading_lists_set_updated_at
  before update on public.reading_lists
  for each row execute function public.touch_profiles_updated_at();

create index if not exists reading_lists_user_idx on public.reading_lists (user_id, created_at desc);


create table if not exists public.reading_list_items (
  id              uuid primary key default gen_random_uuid(),
  reading_list_id uuid not null references public.reading_lists(id) on delete cascade,
  record_id       text not null,
  position        integer not null default 0,
  note            text,
  added_at        timestamptz not null default now(),
  unique (reading_list_id, record_id)
);

create index if not exists reading_list_items_list_idx
  on public.reading_list_items (reading_list_id, position);


-- ----------------------------------------------------------------------------
-- 6. Row Level Security
-- ----------------------------------------------------------------------------

alter table public.profiles            enable row level security;
alter table public.bookmarks           enable row level security;
alter table public.saved_searches      enable row level security;
alter table public.reading_lists       enable row level security;
alter table public.reading_list_items  enable row level security;

-- profiles ---------------------------------------------------------------
drop policy if exists "profiles: read own"     on public.profiles;
drop policy if exists "profiles: read all (admin)" on public.profiles;
drop policy if exists "profiles: update own"   on public.profiles;
drop policy if exists "profiles: admin update" on public.profiles;

create policy "profiles: read own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: read all (admin)"
  on public.profiles for select
  using (public.is_admin());

-- Users may update their own row, BUT cannot change their own role.
create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select role from public.profiles where id = auth.uid())
  );

-- Admins may update any profile, including role.
create policy "profiles: admin update"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());


-- bookmarks --------------------------------------------------------------
drop policy if exists "bookmarks: read own"   on public.bookmarks;
drop policy if exists "bookmarks: write own"  on public.bookmarks;
drop policy if exists "bookmarks: update own" on public.bookmarks;
drop policy if exists "bookmarks: delete own" on public.bookmarks;

create policy "bookmarks: read own"
  on public.bookmarks for select
  using (auth.uid() = user_id);

create policy "bookmarks: write own"
  on public.bookmarks for insert
  with check (auth.uid() = user_id);

create policy "bookmarks: update own"
  on public.bookmarks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "bookmarks: delete own"
  on public.bookmarks for delete
  using (auth.uid() = user_id);


-- saved_searches ---------------------------------------------------------
drop policy if exists "saved_searches: read own"   on public.saved_searches;
drop policy if exists "saved_searches: write own"  on public.saved_searches;
drop policy if exists "saved_searches: update own" on public.saved_searches;
drop policy if exists "saved_searches: delete own" on public.saved_searches;

create policy "saved_searches: read own"
  on public.saved_searches for select
  using (auth.uid() = user_id);

create policy "saved_searches: write own"
  on public.saved_searches for insert
  with check (auth.uid() = user_id);

create policy "saved_searches: update own"
  on public.saved_searches for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "saved_searches: delete own"
  on public.saved_searches for delete
  using (auth.uid() = user_id);


-- reading_lists ----------------------------------------------------------
drop policy if exists "reading_lists: read own or public" on public.reading_lists;
drop policy if exists "reading_lists: write own"          on public.reading_lists;
drop policy if exists "reading_lists: update own"         on public.reading_lists;
drop policy if exists "reading_lists: delete own"         on public.reading_lists;

create policy "reading_lists: read own or public"
  on public.reading_lists for select
  using (auth.uid() = user_id or is_public = true);

create policy "reading_lists: write own"
  on public.reading_lists for insert
  with check (auth.uid() = user_id);

create policy "reading_lists: update own"
  on public.reading_lists for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "reading_lists: delete own"
  on public.reading_lists for delete
  using (auth.uid() = user_id);


-- reading_list_items -----------------------------------------------------
drop policy if exists "reading_list_items: read own list" on public.reading_list_items;
drop policy if exists "reading_list_items: write own"     on public.reading_list_items;
drop policy if exists "reading_list_items: update own"    on public.reading_list_items;
drop policy if exists "reading_list_items: delete own"    on public.reading_list_items;

create policy "reading_list_items: read own list"
  on public.reading_list_items for select
  using (
    exists (
      select 1 from public.reading_lists rl
      where rl.id = reading_list_items.reading_list_id
        and (rl.user_id = auth.uid() or rl.is_public = true)
    )
  );

create policy "reading_list_items: write own"
  on public.reading_list_items for insert
  with check (
    exists (
      select 1 from public.reading_lists rl
      where rl.id = reading_list_items.reading_list_id
        and rl.user_id = auth.uid()
    )
  );

create policy "reading_list_items: update own"
  on public.reading_list_items for update
  using (
    exists (
      select 1 from public.reading_lists rl
      where rl.id = reading_list_items.reading_list_id
        and rl.user_id = auth.uid()
    )
  );

create policy "reading_list_items: delete own"
  on public.reading_list_items for delete
  using (
    exists (
      select 1 from public.reading_lists rl
      where rl.id = reading_list_items.reading_list_id
        and rl.user_id = auth.uid()
    )
  );


-- ----------------------------------------------------------------------------
-- 7. Backfill: any existing auth.users without a profile row gets one.
-- ----------------------------------------------------------------------------

insert into public.profiles (id, email, full_name, role)
select u.id, u.email, u.raw_user_meta_data ->> 'full_name', 'member'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
