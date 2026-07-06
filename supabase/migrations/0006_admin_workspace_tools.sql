-- Admin dashboard workspace tools: projects, kanban, calendar, team chat.
-- Apply after 0001 (profiles + is_admin).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.admin_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'active',
  owner text,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_projects_status_check check (
    status in ('active', 'paused', 'completed', 'archived')
  )
);

create table if not exists public.admin_kanban_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'backlog',
  position integer not null default 0,
  project_id uuid references public.admin_projects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_kanban_tasks_status_check check (
    status in ('backlog', 'in_progress', 'review', 'done')
  )
);

create table if not exists public.admin_calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  event_date date not null,
  event_time time,
  event_type text default 'general',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  sender_name text,
  body text not null,
  channel text not null default 'team',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists admin_projects_user_idx
  on public.admin_projects (user_id, created_at desc);

create index if not exists admin_kanban_tasks_status_idx
  on public.admin_kanban_tasks (status, position);

create index if not exists admin_calendar_events_date_idx
  on public.admin_calendar_events (event_date);

create index if not exists admin_chat_messages_channel_idx
  on public.admin_chat_messages (channel, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at triggers (reuse global touch function from 0001)
-- ---------------------------------------------------------------------------

drop trigger if exists admin_projects_set_updated_at on public.admin_projects;
create trigger admin_projects_set_updated_at
  before update on public.admin_projects
  for each row execute function public.touch_profiles_updated_at();

drop trigger if exists admin_kanban_tasks_set_updated_at on public.admin_kanban_tasks;
create trigger admin_kanban_tasks_set_updated_at
  before update on public.admin_kanban_tasks
  for each row execute function public.touch_profiles_updated_at();

drop trigger if exists admin_calendar_events_set_updated_at on public.admin_calendar_events;
create trigger admin_calendar_events_set_updated_at
  before update on public.admin_calendar_events
  for each row execute function public.touch_profiles_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: admin-only; row ownership for projects / kanban / calendar; shared read
-- for team chat, insert as self, update/delete own messages.
-- ---------------------------------------------------------------------------

alter table public.admin_projects enable row level security;
alter table public.admin_kanban_tasks enable row level security;
alter table public.admin_calendar_events enable row level security;
alter table public.admin_chat_messages enable row level security;

drop policy if exists "admin_projects: select own" on public.admin_projects;
drop policy if exists "admin_projects: insert own" on public.admin_projects;
drop policy if exists "admin_projects: update own" on public.admin_projects;
drop policy if exists "admin_projects: delete own" on public.admin_projects;

create policy "admin_projects: select own"
  on public.admin_projects for select to authenticated
  using (public.is_admin() and user_id = auth.uid());

create policy "admin_projects: insert own"
  on public.admin_projects for insert to authenticated
  with check (public.is_admin() and user_id = auth.uid());

create policy "admin_projects: update own"
  on public.admin_projects for update to authenticated
  using (public.is_admin() and user_id = auth.uid())
  with check (public.is_admin() and user_id = auth.uid());

create policy "admin_projects: delete own"
  on public.admin_projects for delete to authenticated
  using (public.is_admin() and user_id = auth.uid());

drop policy if exists "admin_kanban_tasks: select own" on public.admin_kanban_tasks;
drop policy if exists "admin_kanban_tasks: insert own" on public.admin_kanban_tasks;
drop policy if exists "admin_kanban_tasks: update own" on public.admin_kanban_tasks;
drop policy if exists "admin_kanban_tasks: delete own" on public.admin_kanban_tasks;

create policy "admin_kanban_tasks: select own"
  on public.admin_kanban_tasks for select to authenticated
  using (public.is_admin() and user_id = auth.uid());

create policy "admin_kanban_tasks: insert own"
  on public.admin_kanban_tasks for insert to authenticated
  with check (public.is_admin() and user_id = auth.uid());

create policy "admin_kanban_tasks: update own"
  on public.admin_kanban_tasks for update to authenticated
  using (public.is_admin() and user_id = auth.uid())
  with check (public.is_admin() and user_id = auth.uid());

create policy "admin_kanban_tasks: delete own"
  on public.admin_kanban_tasks for delete to authenticated
  using (public.is_admin() and user_id = auth.uid());

drop policy if exists "admin_calendar_events: select own" on public.admin_calendar_events;
drop policy if exists "admin_calendar_events: insert own" on public.admin_calendar_events;
drop policy if exists "admin_calendar_events: update own" on public.admin_calendar_events;
drop policy if exists "admin_calendar_events: delete own" on public.admin_calendar_events;

create policy "admin_calendar_events: select own"
  on public.admin_calendar_events for select to authenticated
  using (public.is_admin() and user_id = auth.uid());

create policy "admin_calendar_events: insert own"
  on public.admin_calendar_events for insert to authenticated
  with check (public.is_admin() and user_id = auth.uid());

create policy "admin_calendar_events: update own"
  on public.admin_calendar_events for update to authenticated
  using (public.is_admin() and user_id = auth.uid())
  with check (public.is_admin() and user_id = auth.uid());

create policy "admin_calendar_events: delete own"
  on public.admin_calendar_events for delete to authenticated
  using (public.is_admin() and user_id = auth.uid());

drop policy if exists "admin_chat_messages: select team" on public.admin_chat_messages;
drop policy if exists "admin_chat_messages: insert own" on public.admin_chat_messages;
drop policy if exists "admin_chat_messages: update own" on public.admin_chat_messages;
drop policy if exists "admin_chat_messages: delete own" on public.admin_chat_messages;

create policy "admin_chat_messages: select team"
  on public.admin_chat_messages for select to authenticated
  using (public.is_admin() and channel = 'team');

create policy "admin_chat_messages: insert own"
  on public.admin_chat_messages for insert to authenticated
  with check (
    public.is_admin()
    and user_id = auth.uid()
    and channel = 'team'
  );

create policy "admin_chat_messages: update own"
  on public.admin_chat_messages for update to authenticated
  using (public.is_admin() and user_id = auth.uid())
  with check (public.is_admin() and user_id = auth.uid());

create policy "admin_chat_messages: delete own"
  on public.admin_chat_messages for delete to authenticated
  using (public.is_admin() and user_id = auth.uid());
