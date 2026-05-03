-- Member profile fields on public.profiles + profile-avatars storage bucket.
-- Requires 0001_auth_and_research.sql (profiles table + RLS).

-- ---------------------------------------------------------------------------
-- 1. Extend profiles
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists display_name text;

alter table public.profiles
  add column if not exists preferred_name text;

alter table public.profiles
  add column if not exists avatar_url text;

alter table public.profiles
  add column if not exists avatar_path text;

alter table public.profiles
  add column if not exists affiliation text;

alter table public.profiles
  add column if not exists organisation text;

alter table public.profiles
  add column if not exists role_title text;

alter table public.profiles
  add column if not exists website text;

alter table public.profiles
  add column if not exists short_bio text;

alter table public.profiles
  add column if not exists research_interests text;

alter table public.profiles
  add column if not exists contact_email text;

alter table public.profiles
  add column if not exists address_line_1 text;

alter table public.profiles
  add column if not exists address_line_2 text;

alter table public.profiles
  add column if not exists city text;

alter table public.profiles
  add column if not exists state_region text;

alter table public.profiles
  add column if not exists postcode text;

alter table public.profiles
  add column if not exists country text;

alter table public.profiles
  add column if not exists profile_visibility text;

update public.profiles
  set profile_visibility = 'private'
  where profile_visibility is null;

alter table public.profiles
  alter column profile_visibility set default 'private';

alter table public.profiles
  alter column profile_visibility set not null;

alter table public.profiles
  drop constraint if exists profiles_profile_visibility_check;

alter table public.profiles
  add constraint profiles_profile_visibility_check
  check (profile_visibility in ('private', 'members_only', 'public'));

-- ---------------------------------------------------------------------------
-- 2. Storage: profile-avatars (public read for image URLs; write own folder)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values ('profile-avatars', 'profile-avatars', true, 5242880)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

drop policy if exists "profile-avatars: public read" on storage.objects;
drop policy if exists "profile-avatars: insert own" on storage.objects;
drop policy if exists "profile-avatars: update own" on storage.objects;
drop policy if exists "profile-avatars: delete own" on storage.objects;

create policy "profile-avatars: public read"
  on storage.objects for select
  using (bucket_id = 'profile-avatars');

create policy "profile-avatars: insert own"
  on storage.objects for insert
  with check (
    bucket_id = 'profile-avatars'
    and auth.role() = 'authenticated'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "profile-avatars: update own"
  on storage.objects for update
  using (
    bucket_id = 'profile-avatars'
    and auth.role() = 'authenticated'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'profile-avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "profile-avatars: delete own"
  on storage.objects for delete
  using (
    bucket_id = 'profile-avatars'
    and auth.role() = 'authenticated'
    and split_part(name, '/', 1) = auth.uid()::text
  );
