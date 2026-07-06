-- Source suggestion / request workflow
create table if not exists public.source_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  title text not null,
  source_url text,
  institution text,
  notes text,
  status text not null default 'pending',
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint source_requests_status_check check (status in ('pending', 'reviewing', 'accepted', 'declined')),
  constraint source_requests_title_length check (char_length(trim(title)) between 3 and 300)
);

alter table public.source_requests enable row level security;

drop policy if exists "Users can insert source requests" on public.source_requests;
create policy "Users can insert source requests"
  on public.source_requests for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can read own source requests" on public.source_requests;
create policy "Users can read own source requests"
  on public.source_requests for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Admins can manage source requests" on public.source_requests;
create policy "Admins can manage source requests"
  on public.source_requests for update
  to authenticated
  using (public.is_admin());

create index if not exists source_requests_user_id_idx on public.source_requests(user_id);
create index if not exists source_requests_status_idx on public.source_requests(status);
create index if not exists source_requests_created_at_idx on public.source_requests(created_at desc);

notify pgrst, 'reload schema';
