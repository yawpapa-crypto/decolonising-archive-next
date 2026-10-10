-- Email sign-ups for the Android test programme. Anyone may add an address; nobody can read the list from the client.
create table if not exists public.android_testers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists android_testers_email_key on public.android_testers (lower(email));
alter table public.android_testers enable row level security;
drop policy if exists "anyone can join android testers" on public.android_testers;
create policy "anyone can join android testers" on public.android_testers for insert to anon, authenticated with check (true);
notify pgrst, 'reload schema';
