-- ARED onboarding + For You interests.
-- Reuses profiles.full_name / display_name / username (already present).
-- profiles.onboarding_completed belongs to the dashboard "getting started" checklist and is left alone.

alter table public.profiles
  add column if not exists interests jsonb not null default '{}'::jsonb,
  add column if not exists onboarding_step smallint not null default 0,
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists interests_updated_at timestamptz;

-- Username shape (NOT VALID: existing rows are not re-checked, new writes are).
alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles
  add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9_]{3,24}$') not valid;

-- Availability must see private profiles too, so it runs as the definer and returns only a boolean.
create or replace function public.username_available(p_username text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (
    select 1 from public.profiles
    where lower(username) = lower(p_username)
      and id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
  );
$$;

revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to authenticated;

notify pgrst, 'reload schema';
