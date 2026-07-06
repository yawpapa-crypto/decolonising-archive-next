-- Stage 2: presence, project activity feed, realtime publication for shared workbench.

-- ----------------------------------------------------------------------------
-- Presence (who is viewing, which mode)
-- ----------------------------------------------------------------------------

create table if not exists public.workbench_project_presence (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.workbench_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  note_id uuid references public.workbench_notes(id) on delete set null,
  note_mode text check (note_mode is null or note_mode in ('document', 'board', 'canvas')),
  display_name text,
  last_seen_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create index if not exists workbench_project_presence_project_seen_idx
  on public.workbench_project_presence (project_id, last_seen_at desc);

alter table public.workbench_project_presence enable row level security;

drop policy if exists "workbench_project_presence: select member" on public.workbench_project_presence;
create policy "workbench_project_presence: select member"
  on public.workbench_project_presence for select
  using (public.workbench_is_project_member(project_id));

drop policy if exists "workbench_project_presence: insert self" on public.workbench_project_presence;
create policy "workbench_project_presence: insert self"
  on public.workbench_project_presence for insert
  with check (
    auth.uid() = user_id
    and public.workbench_is_project_member(project_id)
  );

drop policy if exists "workbench_project_presence: update self" on public.workbench_project_presence;
create policy "workbench_project_presence: update self"
  on public.workbench_project_presence for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and public.workbench_is_project_member(project_id)
  );

drop policy if exists "workbench_project_presence: delete self" on public.workbench_project_presence;
create policy "workbench_project_presence: delete self"
  on public.workbench_project_presence for delete
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Project activity (live notifications)
-- ----------------------------------------------------------------------------

create table if not exists public.workbench_project_activity (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.workbench_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  note_id uuid references public.workbench_notes(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists workbench_project_activity_project_created_idx
  on public.workbench_project_activity (project_id, created_at desc);

alter table public.workbench_project_activity enable row level security;

drop policy if exists "workbench_project_activity: select member" on public.workbench_project_activity;
create policy "workbench_project_activity: select member"
  on public.workbench_project_activity for select
  using (public.workbench_is_project_member(project_id));

drop policy if exists "workbench_project_activity: insert member" on public.workbench_project_activity;
create policy "workbench_project_activity: insert member"
  on public.workbench_project_activity for insert
  with check (
    auth.uid() = user_id
    and public.workbench_is_project_member(project_id)
  );

-- ----------------------------------------------------------------------------
-- Realtime publication
-- ----------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'workbench_notes'
  ) then
    alter publication supabase_realtime add table public.workbench_notes;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'workbench_project_presence'
  ) then
    alter publication supabase_realtime add table public.workbench_project_presence;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'workbench_project_activity'
  ) then
    alter publication supabase_realtime add table public.workbench_project_activity;
  end if;
end $$;
