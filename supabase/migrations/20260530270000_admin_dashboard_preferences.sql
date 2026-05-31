-- Admin workspace dashboard preferences, team-wide admin tool access, chat channels.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Dashboard preferences (per admin user)
-- ---------------------------------------------------------------------------

create table if not exists public.admin_dashboard_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  layout jsonb not null default '{}'::jsonb,
  pinned_tools text[] not null default '{}',
  active_tab text not null default 'overview',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_dashboard_preferences_user_id_key unique (user_id)
);

create index if not exists admin_dashboard_preferences_user_id_idx
  on public.admin_dashboard_preferences (user_id);

drop trigger if exists admin_dashboard_preferences_set_updated_at on public.admin_dashboard_preferences;
create trigger admin_dashboard_preferences_set_updated_at
  before update on public.admin_dashboard_preferences
  for each row execute function public.touch_profiles_updated_at();

alter table public.admin_dashboard_preferences enable row level security;

drop policy if exists "Admins manage own dashboard preferences" on public.admin_dashboard_preferences;
create policy "Admins manage own dashboard preferences"
  on public.admin_dashboard_preferences for all
  to authenticated
  using (public.is_admin() and user_id = auth.uid())
  with check (public.is_admin() and user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Chat channels
-- ---------------------------------------------------------------------------

create table if not exists public.admin_chat_channels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  slug text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.admin_chat_channels enable row level security;

drop policy if exists "Admins read chat channels" on public.admin_chat_channels;
create policy "Admins read chat channels"
  on public.admin_chat_channels for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins insert chat channels" on public.admin_chat_channels;
create policy "Admins insert chat channels"
  on public.admin_chat_channels for insert
  to authenticated
  with check (public.is_admin());

alter table public.admin_chat_messages
  add column if not exists channel_id uuid references public.admin_chat_channels(id) on delete cascade;

insert into public.admin_chat_channels (name, description, slug)
values
  ('General', 'Team-wide updates and coordination', 'general'),
  ('Bugs', 'Bug reports and fixes', 'bugs'),
  ('Sources', 'Source ingestion and external APIs', 'sources'),
  ('Community', 'Community moderation and engagement', 'community'),
  ('Grants', 'Grant deadlines and reporting', 'grants')
on conflict (slug) do nothing;

update public.admin_chat_messages m
set channel_id = c.id
from public.admin_chat_channels c
where m.channel_id is null
  and (
    (m.channel = 'team' and c.slug = 'general')
    or c.slug = m.channel
  );

-- ---------------------------------------------------------------------------
-- Kanban: add blocked status
-- ---------------------------------------------------------------------------

alter table public.admin_kanban_tasks drop constraint if exists admin_kanban_tasks_status_check;
alter table public.admin_kanban_tasks
  add constraint admin_kanban_tasks_status_check check (
    status in ('backlog', 'todo', 'in_progress', 'review', 'done', 'blocked')
  );

-- ---------------------------------------------------------------------------
-- Team-wide admin workspace RLS (all admins share platform work tools)
-- ---------------------------------------------------------------------------

drop policy if exists "admin_projects: select own" on public.admin_projects;
drop policy if exists "admin_projects: insert own" on public.admin_projects;
drop policy if exists "admin_projects: update own" on public.admin_projects;
drop policy if exists "admin_projects: delete own" on public.admin_projects;

create policy "admin_projects: admins select"
  on public.admin_projects for select to authenticated
  using (public.is_admin());

create policy "admin_projects: admins insert"
  on public.admin_projects for insert to authenticated
  with check (public.is_admin());

create policy "admin_projects: admins update"
  on public.admin_projects for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin_projects: admins delete"
  on public.admin_projects for delete to authenticated
  using (public.is_admin());

drop policy if exists "admin_kanban_tasks: select own" on public.admin_kanban_tasks;
drop policy if exists "admin_kanban_tasks: insert own" on public.admin_kanban_tasks;
drop policy if exists "admin_kanban_tasks: update own" on public.admin_kanban_tasks;
drop policy if exists "admin_kanban_tasks: delete own" on public.admin_kanban_tasks;

create policy "admin_kanban_tasks: admins select"
  on public.admin_kanban_tasks for select to authenticated
  using (public.is_admin());

create policy "admin_kanban_tasks: admins insert"
  on public.admin_kanban_tasks for insert to authenticated
  with check (public.is_admin());

create policy "admin_kanban_tasks: admins update"
  on public.admin_kanban_tasks for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin_kanban_tasks: admins delete"
  on public.admin_kanban_tasks for delete to authenticated
  using (public.is_admin());

drop policy if exists "admin_calendar_events: select own" on public.admin_calendar_events;
drop policy if exists "admin_calendar_events: insert own" on public.admin_calendar_events;
drop policy if exists "admin_calendar_events: update own" on public.admin_calendar_events;
drop policy if exists "admin_calendar_events: delete own" on public.admin_calendar_events;

create policy "admin_calendar_events: admins select"
  on public.admin_calendar_events for select to authenticated
  using (public.is_admin());

create policy "admin_calendar_events: admins insert"
  on public.admin_calendar_events for insert to authenticated
  with check (public.is_admin());

create policy "admin_calendar_events: admins update"
  on public.admin_calendar_events for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin_calendar_events: admins delete"
  on public.admin_calendar_events for delete to authenticated
  using (public.is_admin());

drop policy if exists "admin_chat_messages: select team" on public.admin_chat_messages;
drop policy if exists "admin_chat_messages: insert own" on public.admin_chat_messages;
drop policy if exists "admin_chat_messages: update own" on public.admin_chat_messages;
drop policy if exists "admin_chat_messages: delete own" on public.admin_chat_messages;

create policy "admin_chat_messages: admins select"
  on public.admin_chat_messages for select to authenticated
  using (public.is_admin());

create policy "admin_chat_messages: admins insert"
  on public.admin_chat_messages for insert to authenticated
  with check (public.is_admin() and user_id = auth.uid());

create policy "admin_chat_messages: admins update own"
  on public.admin_chat_messages for update to authenticated
  using (public.is_admin() and user_id = auth.uid())
  with check (public.is_admin() and user_id = auth.uid());

create policy "admin_chat_messages: admins delete own"
  on public.admin_chat_messages for delete to authenticated
  using (public.is_admin() and user_id = auth.uid());

notify pgrst, 'reload schema';
