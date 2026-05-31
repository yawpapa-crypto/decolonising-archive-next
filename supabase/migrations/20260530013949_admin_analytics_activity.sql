-- Privacy-aware platform analytics for admin reporting and technical monitoring.
-- This intentionally stores activity metadata only; private note/document/canvas
-- body content should never be written to these tables.

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists last_login_at timestamptz,
  add column if not exists last_seen_at timestamptz;

create table if not exists public.user_activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  session_id text,
  event_type text not null,
  area text,
  action text,
  target_type text,
  target_id text,
  query text,
  metadata jsonb not null default '{}'::jsonb,
  path text,
  referrer text,
  user_agent text,
  ip_hash text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  session_id text not null,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer not null default 0,
  path_first text,
  path_last text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  unique (session_id)
);

create table if not exists public.search_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  session_id text,
  query text not null,
  source_scope text,
  result_count integer not null default 0,
  external_result_count integer not null default 0,
  local_result_count integer not null default 0,
  duration_ms integer,
  status text not null default 'success',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.app_error_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  session_id text,
  area text,
  message text not null,
  code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists user_activity_events_created_at_idx
  on public.user_activity_events (created_at desc);
create index if not exists user_activity_events_user_created_idx
  on public.user_activity_events (user_id, created_at desc);
create index if not exists user_activity_events_type_created_idx
  on public.user_activity_events (event_type, created_at desc);
create index if not exists user_activity_events_area_created_idx
  on public.user_activity_events (area, created_at desc);

create index if not exists user_sessions_last_seen_idx
  on public.user_sessions (last_seen_at desc);
create index if not exists user_sessions_user_last_seen_idx
  on public.user_sessions (user_id, last_seen_at desc);

create index if not exists search_events_created_at_idx
  on public.search_events (created_at desc);
create index if not exists search_events_query_idx
  on public.search_events (lower(query));
create index if not exists search_events_user_created_idx
  on public.search_events (user_id, created_at desc);

create index if not exists app_error_logs_created_at_idx
  on public.app_error_logs (created_at desc);
create index if not exists app_error_logs_area_created_idx
  on public.app_error_logs (area, created_at desc);

alter table public.user_activity_events enable row level security;
alter table public.user_sessions enable row level security;
alter table public.search_events enable row level security;
alter table public.app_error_logs enable row level security;

drop policy if exists "Admins can read user activity events" on public.user_activity_events;
create policy "Admins can read user activity events"
  on public.user_activity_events
  for select
  using (public.is_admin());

drop policy if exists "Users can insert own activity events" on public.user_activity_events;
create policy "Users can insert own activity events"
  on public.user_activity_events
  for insert
  with check (user_id is null or user_id = auth.uid());

drop policy if exists "Admins can read user sessions" on public.user_sessions;
create policy "Admins can read user sessions"
  on public.user_sessions
  for select
  using (public.is_admin());

drop policy if exists "Users can insert own sessions" on public.user_sessions;
create policy "Users can insert own sessions"
  on public.user_sessions
  for insert
  with check (user_id is null or user_id = auth.uid());

drop policy if exists "Users can update own sessions" on public.user_sessions;
create policy "Users can update own sessions"
  on public.user_sessions
  for update
  using (user_id is null or user_id = auth.uid())
  with check (user_id is null or user_id = auth.uid());

drop policy if exists "Admins can read search events" on public.search_events;
create policy "Admins can read search events"
  on public.search_events
  for select
  using (public.is_admin());

drop policy if exists "Users can insert own search events" on public.search_events;
create policy "Users can insert own search events"
  on public.search_events
  for insert
  with check (user_id is null or user_id = auth.uid());

drop policy if exists "Admins can read app error logs" on public.app_error_logs;
create policy "Admins can read app error logs"
  on public.app_error_logs
  for select
  using (public.is_admin());

drop policy if exists "Users can insert own app error logs" on public.app_error_logs;
create policy "Users can insert own app error logs"
  on public.app_error_logs
  for insert
  with check (user_id is null or user_id = auth.uid());

notify pgrst, 'reload schema';
