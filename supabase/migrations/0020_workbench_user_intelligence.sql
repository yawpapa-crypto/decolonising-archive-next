-- User-specific workbench intelligence: activity events and preferences

create table if not exists public.workbench_activity_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  event_type  text not null,
  entity_type text not null,
  entity_id   text,
  project_id  uuid references public.workbench_projects(id) on delete set null,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists workbench_activity_events_user_created_idx
  on public.workbench_activity_events (user_id, created_at desc);

create index if not exists workbench_activity_events_user_type_idx
  on public.workbench_activity_events (user_id, event_type);

alter table public.workbench_activity_events enable row level security;

drop policy if exists "workbench_activity_events: select own" on public.workbench_activity_events;
drop policy if exists "workbench_activity_events: insert own" on public.workbench_activity_events;

create policy "workbench_activity_events: select own"
  on public.workbench_activity_events for select
  using (auth.uid() = user_id);

create policy "workbench_activity_events: insert own"
  on public.workbench_activity_events for insert
  with check (auth.uid() = user_id);

create table if not exists public.workbench_user_preferences (
  user_id                  uuid primary key references auth.users(id) on delete cascade,
  preferred_citation_style text not null default 'apa7',
  preferred_board_view     text not null default 'comfortable',
  preferred_note_mode    text not null default 'document',
  dismissed_suggestions    jsonb not null default '[]'::jsonb,
  pinned_collections       jsonb not null default '[]'::jsonb,
  updated_at               timestamptz not null default now()
);

drop trigger if exists workbench_user_preferences_set_updated_at on public.workbench_user_preferences;
create trigger workbench_user_preferences_set_updated_at
  before update on public.workbench_user_preferences
  for each row execute function public.touch_profiles_updated_at();

alter table public.workbench_user_preferences enable row level security;

drop policy if exists "workbench_user_preferences: select own" on public.workbench_user_preferences;
drop policy if exists "workbench_user_preferences: insert own" on public.workbench_user_preferences;
drop policy if exists "workbench_user_preferences: update own" on public.workbench_user_preferences;

create policy "workbench_user_preferences: select own"
  on public.workbench_user_preferences for select
  using (auth.uid() = user_id);

create policy "workbench_user_preferences: insert own"
  on public.workbench_user_preferences for insert
  with check (auth.uid() = user_id);

create policy "workbench_user_preferences: update own"
  on public.workbench_user_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
