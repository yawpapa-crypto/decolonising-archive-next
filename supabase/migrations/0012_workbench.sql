-- ============================================================================
-- Archive Workbench — research projects, linked records, tasks, milestones,
-- annotations, collaborators (Supabase-ready; idempotent where practical).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper predicates (avoid recursive RLS on collaborators ↔ projects)
-- ----------------------------------------------------------------------------

create or replace function public.workbench_project_owner(project_uuid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select owner_id from public.workbench_projects where id = project_uuid;
$$;

create or replace function public.workbench_is_project_member(project_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1 from public.workbench_projects p
      where p.id = project_uuid
        and p.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.workbench_collaborators c
      where c.project_id = project_uuid
        and c.user_id is not null
        and c.user_id = auth.uid()
    );
$$;

create or replace function public.workbench_can_manage_project(project_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1 from public.workbench_projects p
      where p.id = project_uuid and p.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.workbench_collaborators c
      where c.project_id = project_uuid
        and c.user_id = auth.uid()
        and c.role = 'editor'
    );
$$;

create or replace function public.workbench_can_review_content(project_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.workbench_can_manage_project(project_uuid)
    or exists (
      select 1 from public.workbench_collaborators c
      where c.project_id = project_uuid
        and c.user_id = auth.uid()
        and c.role = 'reviewer'
    );
$$;

create or replace function public.workbench_can_read_project(project_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.workbench_is_project_member(project_uuid)
    or exists (
      select 1 from public.workbench_projects p
      where p.id = project_uuid
        and p.visibility = 'public'
        and auth.uid() is not null
    );
$$;

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table if not exists public.workbench_projects (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  title         text not null,
  description   text,
  project_type  text not null default 'custom_project',
  visibility    text not null default 'private'
    check (visibility in ('private', 'shared', 'public')),
  status        text not null default 'active'
    check (status in ('active', 'paused', 'completed', 'archived')),
  deadline      date,
  is_curated_public boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists workbench_projects_owner_idx
  on public.workbench_projects (owner_id, created_at desc);

drop trigger if exists workbench_projects_set_updated_at on public.workbench_projects;
create trigger workbench_projects_set_updated_at
  before update on public.workbench_projects
  for each row execute function public.touch_profiles_updated_at();


create table if not exists public.workbench_collaborators (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.workbench_projects(id) on delete cascade,
  user_id        uuid references auth.users(id) on delete cascade,
  invited_email  text,
  role           text not null default 'viewer'
    check (role in ('owner', 'editor', 'reviewer', 'viewer')),
  created_at     timestamptz not null default now(),
  check (user_id is not null or invited_email is not null)
);

create unique index if not exists workbench_collaborators_project_user_key
  on public.workbench_collaborators (project_id, user_id)
  where user_id is not null;

create unique index if not exists workbench_collaborators_project_email_key
  on public.workbench_collaborators (project_id, lower(trim(invited_email)))
  where invited_email is not null and length(trim(invited_email)) > 0;

create index if not exists workbench_collaborators_project_idx
  on public.workbench_collaborators (project_id);

create index if not exists workbench_collaborators_user_idx
  on public.workbench_collaborators (user_id);


create table if not exists public.workbench_project_records (
  id                      uuid primary key default gen_random_uuid(),
  project_id              uuid not null references public.workbench_projects(id) on delete cascade,
  record_id               text not null,
  status                  text not null default 'to_review'
    check (status in (
      'to_review',
      'reading',
      'to_annotate',
      'metadata_check',
      'rights_check',
      'cultural_review',
      'writing_annotation',
      'ready_to_publish',
      'completed',
      'exclude'
    )),
  notes                   text,
  usefulness_tags         text[] not null default '{}'::text[],
  citation_checked        boolean not null default false,
  source_checked          boolean not null default false,
  rights_checked          boolean not null default false,
  cultural_review_needed  boolean not null default false,
  metadata_review_needed  boolean not null default false,
  date_accessed           date,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (project_id, record_id)
);

create index if not exists workbench_project_records_project_idx
  on public.workbench_project_records (project_id, status);

drop trigger if exists workbench_project_records_set_updated_at on public.workbench_project_records;
create trigger workbench_project_records_set_updated_at
  before update on public.workbench_project_records
  for each row execute function public.touch_profiles_updated_at();


create table if not exists public.workbench_tasks (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references public.workbench_projects(id) on delete cascade,
  title              text not null,
  description        text,
  assigned_to        uuid references auth.users(id) on delete set null,
  due_date           date,
  status             text not null default 'todo'
    check (status in ('todo', 'in_progress', 'waiting', 'done')),
  priority           text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'urgent')),
  linked_record_ids  text[] not null default '{}'::text[],
  notes              text,
  review_type        text not null default 'general'
    check (review_type in (
      'general',
      'source_check',
      'citation_check',
      'metadata_check',
      'rights_check',
      'cultural_review',
      'writing',
      'supervisor_feedback',
      'publication_prep'
    )),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists workbench_tasks_project_idx
  on public.workbench_tasks (project_id, due_date);

drop trigger if exists workbench_tasks_set_updated_at on public.workbench_tasks;
create trigger workbench_tasks_set_updated_at
  before update on public.workbench_tasks
  for each row execute function public.touch_profiles_updated_at();


create table if not exists public.workbench_milestones (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.workbench_projects(id) on delete cascade,
  title        text not null,
  description  text,
  due_date     date,
  status       text not null default 'pending'
    check (status in ('pending', 'completed')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists workbench_milestones_project_idx
  on public.workbench_milestones (project_id, due_date);

drop trigger if exists workbench_milestones_set_updated_at on public.workbench_milestones;
create trigger workbench_milestones_set_updated_at
  before update on public.workbench_milestones
  for each row execute function public.touch_profiles_updated_at();


create table if not exists public.workbench_annotations (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.workbench_projects(id) on delete cascade,
  record_id   text not null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  note        text not null,
  tags        text[] not null default '{}'::text[],
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists workbench_annotations_project_idx
  on public.workbench_annotations (project_id, created_at desc);

drop trigger if exists workbench_annotations_set_updated_at on public.workbench_annotations;
create trigger workbench_annotations_set_updated_at
  before update on public.workbench_annotations
  for each row execute function public.touch_profiles_updated_at();

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------

alter table public.workbench_projects enable row level security;
alter table public.workbench_collaborators enable row level security;
alter table public.workbench_project_records enable row level security;
alter table public.workbench_tasks enable row level security;
alter table public.workbench_milestones enable row level security;
alter table public.workbench_annotations enable row level security;

-- workbench_projects ---------------------------------------------------------
drop policy if exists "workbench_projects: select member or public" on public.workbench_projects;
drop policy if exists "workbench_projects: insert own" on public.workbench_projects;
drop policy if exists "workbench_projects: update manage" on public.workbench_projects;
drop policy if exists "workbench_projects: delete owner" on public.workbench_projects;

create policy "workbench_projects: select member or public"
  on public.workbench_projects for select
  using (
    (visibility = 'public' and auth.uid() is not null)
    or public.workbench_is_project_member(id)
  );

create policy "workbench_projects: insert own"
  on public.workbench_projects for insert
  with check (auth.uid() = owner_id);

create policy "workbench_projects: update manage"
  on public.workbench_projects for update
  using (public.workbench_can_manage_project(id))
  with check (public.workbench_can_manage_project(id));

create policy "workbench_projects: delete owner"
  on public.workbench_projects for delete
  using (auth.uid() = owner_id);

-- workbench_collaborators ----------------------------------------------------
drop policy if exists "workbench_collaborators: select member" on public.workbench_collaborators;
drop policy if exists "workbench_collaborators: insert manage" on public.workbench_collaborators;
drop policy if exists "workbench_collaborators: update manage" on public.workbench_collaborators;
drop policy if exists "workbench_collaborators: delete manage" on public.workbench_collaborators;

create policy "workbench_collaborators: select member"
  on public.workbench_collaborators for select
  using (public.workbench_is_project_member(project_id));

create policy "workbench_collaborators: insert manage"
  on public.workbench_collaborators for insert
  with check (public.workbench_can_manage_project(project_id));

create policy "workbench_collaborators: update manage"
  on public.workbench_collaborators for update
  using (public.workbench_can_manage_project(project_id))
  with check (public.workbench_can_manage_project(project_id));

create policy "workbench_collaborators: delete manage"
  on public.workbench_collaborators for delete
  using (public.workbench_can_manage_project(project_id));

-- workbench_project_records --------------------------------------------------
drop policy if exists "workbench_project_records: select member" on public.workbench_project_records;
drop policy if exists "workbench_project_records: insert review" on public.workbench_project_records;
drop policy if exists "workbench_project_records: update review" on public.workbench_project_records;
drop policy if exists "workbench_project_records: delete manage" on public.workbench_project_records;

create policy "workbench_project_records: select member"
  on public.workbench_project_records for select
  using (public.workbench_can_read_project(project_id));

create policy "workbench_project_records: insert review"
  on public.workbench_project_records for insert
  with check (public.workbench_can_review_content(project_id));

create policy "workbench_project_records: update review"
  on public.workbench_project_records for update
  using (public.workbench_can_review_content(project_id))
  with check (public.workbench_can_review_content(project_id));

create policy "workbench_project_records: delete manage"
  on public.workbench_project_records for delete
  using (public.workbench_can_manage_project(project_id));

-- workbench_tasks ------------------------------------------------------------
drop policy if exists "workbench_tasks: select member" on public.workbench_tasks;
drop policy if exists "workbench_tasks: insert manage" on public.workbench_tasks;
drop policy if exists "workbench_tasks: update manage" on public.workbench_tasks;
drop policy if exists "workbench_tasks: delete manage" on public.workbench_tasks;

create policy "workbench_tasks: select member"
  on public.workbench_tasks for select
  using (public.workbench_can_read_project(project_id));

create policy "workbench_tasks: insert manage"
  on public.workbench_tasks for insert
  with check (public.workbench_can_manage_project(project_id));

create policy "workbench_tasks: update manage"
  on public.workbench_tasks for update
  using (public.workbench_can_manage_project(project_id))
  with check (public.workbench_can_manage_project(project_id));

create policy "workbench_tasks: delete manage"
  on public.workbench_tasks for delete
  using (public.workbench_can_manage_project(project_id));

-- workbench_milestones -------------------------------------------------------
drop policy if exists "workbench_milestones: select member" on public.workbench_milestones;
drop policy if exists "workbench_milestones: insert manage" on public.workbench_milestones;
drop policy if exists "workbench_milestones: update manage" on public.workbench_milestones;
drop policy if exists "workbench_milestones: delete manage" on public.workbench_milestones;

create policy "workbench_milestones: select member"
  on public.workbench_milestones for select
  using (public.workbench_can_read_project(project_id));

create policy "workbench_milestones: insert manage"
  on public.workbench_milestones for insert
  with check (public.workbench_can_manage_project(project_id));

create policy "workbench_milestones: update manage"
  on public.workbench_milestones for update
  using (public.workbench_can_manage_project(project_id))
  with check (public.workbench_can_manage_project(project_id));

create policy "workbench_milestones: delete manage"
  on public.workbench_milestones for delete
  using (public.workbench_can_manage_project(project_id));

-- workbench_annotations ------------------------------------------------------
drop policy if exists "workbench_annotations: select member" on public.workbench_annotations;
drop policy if exists "workbench_annotations: insert self member" on public.workbench_annotations;
drop policy if exists "workbench_annotations: update self" on public.workbench_annotations;
drop policy if exists "workbench_annotations: delete self or manage" on public.workbench_annotations;

create policy "workbench_annotations: select member"
  on public.workbench_annotations for select
  using (public.workbench_can_read_project(project_id));

create policy "workbench_annotations: insert self member"
  on public.workbench_annotations for insert
  with check (
    auth.uid() = user_id
    and public.workbench_can_review_content(project_id)
  );

create policy "workbench_annotations: update self"
  on public.workbench_annotations for update
  using (
    auth.uid() = user_id
    and public.workbench_can_review_content(project_id)
  )
  with check (
    auth.uid() = user_id
    and public.workbench_can_review_content(project_id)
  );

create policy "workbench_annotations: delete self or manage"
  on public.workbench_annotations for delete
  using (
    auth.uid() = user_id
    or public.workbench_can_manage_project(project_id)
  );
