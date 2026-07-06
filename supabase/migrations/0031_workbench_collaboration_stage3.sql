-- Stage 3: note versions, canvas object locks, project comments.

-- ----------------------------------------------------------------------------
-- Note version snapshots (recovery)
-- ----------------------------------------------------------------------------

create table if not exists public.workbench_note_versions (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.workbench_notes(id) on delete cascade,
  project_id uuid references public.workbench_projects(id) on delete cascade,
  saved_by uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled note',
  content_html text,
  content_json jsonb,
  plain_text text,
  word_count integer,
  character_count integer,
  created_at timestamptz not null default now()
);

create index if not exists workbench_note_versions_note_created_idx
  on public.workbench_note_versions (note_id, created_at desc);

alter table public.workbench_note_versions
  add column if not exists project_id uuid references public.workbench_projects(id) on delete cascade,
  add column if not exists saved_by uuid references auth.users(id) on delete cascade,
  add column if not exists title text not null default 'Untitled note',
  add column if not exists content_html text,
  add column if not exists content_json jsonb,
  add column if not exists plain_text text,
  add column if not exists word_count integer,
  add column if not exists character_count integer,
  add column if not exists created_at timestamptz not null default now();

update public.workbench_note_versions
set saved_by = coalesce(saved_by, user_id)
where saved_by is null;

alter table public.workbench_note_versions
  alter column saved_by set not null;

alter table public.workbench_note_versions enable row level security;

drop policy if exists "workbench_note_versions: select" on public.workbench_note_versions;
create policy "workbench_note_versions: select"
  on public.workbench_note_versions for select
  using (public.workbench_can_read_note(note_id));

drop policy if exists "workbench_note_versions: insert editor" on public.workbench_note_versions;
create policy "workbench_note_versions: insert editor"
  on public.workbench_note_versions for insert
  with check (
    auth.uid() = saved_by
    and public.workbench_can_edit_note(note_id)
  );

drop policy if exists "workbench_note_versions: delete editor" on public.workbench_note_versions;
create policy "workbench_note_versions: delete editor"
  on public.workbench_note_versions for delete
  using (public.workbench_can_edit_note(note_id));

-- ----------------------------------------------------------------------------
-- Canvas object locks (soft lock while editing)
-- ----------------------------------------------------------------------------

create table if not exists public.workbench_canvas_object_locks (
  note_id uuid not null references public.workbench_notes(id) on delete cascade,
  object_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text,
  locked_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key (note_id, object_id)
);

create index if not exists workbench_canvas_object_locks_note_idx
  on public.workbench_canvas_object_locks (note_id);

alter table public.workbench_canvas_object_locks enable row level security;

drop policy if exists "workbench_canvas_object_locks: select" on public.workbench_canvas_object_locks;
create policy "workbench_canvas_object_locks: select"
  on public.workbench_canvas_object_locks for select
  using (public.workbench_can_read_note(note_id));

drop policy if exists "workbench_canvas_object_locks: insert" on public.workbench_canvas_object_locks;
create policy "workbench_canvas_object_locks: insert"
  on public.workbench_canvas_object_locks for insert
  with check (
    auth.uid() = user_id
    and public.workbench_can_edit_note(note_id)
  );

drop policy if exists "workbench_canvas_object_locks: update" on public.workbench_canvas_object_locks;
create policy "workbench_canvas_object_locks: update"
  on public.workbench_canvas_object_locks for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and public.workbench_can_edit_note(note_id)
  );

drop policy if exists "workbench_canvas_object_locks: delete" on public.workbench_canvas_object_locks;
create policy "workbench_canvas_object_locks: delete"
  on public.workbench_canvas_object_locks for delete
  using (
    auth.uid() = user_id
    or public.workbench_can_edit_note(note_id)
  );

-- ----------------------------------------------------------------------------
-- Project comments (anchors on document / board / canvas)
-- ----------------------------------------------------------------------------

create table if not exists public.workbench_project_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.workbench_projects(id) on delete cascade,
  note_id uuid references public.workbench_notes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  anchor_type text check (
    anchor_type is null
    or anchor_type in ('document', 'board', 'canvas', 'project')
  ),
  anchor_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workbench_project_comments_project_created_idx
  on public.workbench_project_comments (project_id, created_at desc);

alter table public.workbench_project_comments enable row level security;

drop policy if exists "workbench_project_comments: select member" on public.workbench_project_comments;
create policy "workbench_project_comments: select member"
  on public.workbench_project_comments for select
  using (public.workbench_is_project_member(project_id));

drop policy if exists "workbench_project_comments: insert member" on public.workbench_project_comments;
create policy "workbench_project_comments: insert member"
  on public.workbench_project_comments for insert
  with check (
    auth.uid() = user_id
    and public.workbench_is_project_member(project_id)
  );

drop policy if exists "workbench_project_comments: update own" on public.workbench_project_comments;
create policy "workbench_project_comments: update own"
  on public.workbench_project_comments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "workbench_project_comments: delete own" on public.workbench_project_comments;
create policy "workbench_project_comments: delete own"
  on public.workbench_project_comments for delete
  using (auth.uid() = user_id);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'workbench_canvas_object_locks'
  ) then
    alter publication supabase_realtime add table public.workbench_canvas_object_locks;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'workbench_project_comments'
  ) then
    alter publication supabase_realtime add table public.workbench_project_comments;
  end if;
end $$;
