-- Extend profiles for public/community profile support.
-- Adds username (for friendly URLs), bio field alias, and RLS policies
-- that allow members to view community-visible profiles.

-- 1. Username for friendly profile URLs
alter table public.profiles
  add column if not exists username text;

create unique index if not exists profiles_username_idx
  on public.profiles (lower(username))
  where username is not null;

-- 2. Allow members to read community-visible profiles
--    (profile_visibility = 'public' or 'members_only' and viewer is authenticated)

drop policy if exists "Members can view community profiles" on public.profiles;
create policy "Members can view community profiles"
  on public.profiles
  for select
  using (
    -- admins see everything
    public.is_admin()
    -- own profile
    or auth.uid() = id
    -- public profiles visible to all
    or profile_visibility = 'public'
    -- members_only visible to signed-in users
    or (profile_visibility = 'members_only' and auth.uid() is not null)
  );

-- 3. Add admin query helper for per-user analytics
-- Returns activity summary for a single user (admin use only, checked in app layer)

notify pgrst, 'reload schema';
