-- Add extraction fields, extraction values, assignments, and comments for review projects

create table if not exists public.workbench_review_extraction_fields (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.workbench_review_projects(id) on delete cascade,
  field_key text not null,
  name text not null,
  field_type text not null,
  options jsonb not null default '{}'::jsonb,
  required boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, field_key)
);

create index if not exists workbench_review_extraction_fields_project_idx
  on public.workbench_review_extraction_fields (project_id);

-- Extraction values per record (per user)
create table if not exists public.workbench_review_extractions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.workbench_review_projects(id) on delete cascade,
  field_id uuid not null references public.workbench_review_extraction_fields(id) on delete cascade,
  record_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, field_id, record_id, user_id)
);

create index if not exists workbench_review_extractions_project_idx
  on public.workbench_review_extractions (project_id, field_id);

-- Per-record assignment (who should screen/review a record)
create table if not exists public.workbench_review_assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.workbench_review_projects(id) on delete cascade,
  record_id text not null,
  assignee_user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'primary' check (role in ('primary','secondary')),
  assigned_at timestamptz not null default now(),
  unique (project_id, record_id, assignee_user_id)
);

create index if not exists workbench_review_assignments_project_idx
  on public.workbench_review_assignments (project_id, assignee_user_id);

-- Threaded comments for review records
create table if not exists public.workbench_review_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.workbench_review_projects(id) on delete cascade,
  record_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.workbench_review_comments(id) on delete cascade,
  body text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workbench_review_comments_project_idx
  on public.workbench_review_comments (project_id, record_id);

-- Enable RLS for new tables
alter table public.workbench_review_extraction_fields enable row level security;
alter table public.workbench_review_extractions enable row level security;
alter table public.workbench_review_assignments enable row level security;
alter table public.workbench_review_comments enable row level security;

-- Policies: allow project owner or accepted collaborators to select/insert/update/delete

-- Helper policy expression uses existence in workbench_collaborators

-- extraction fields: owner or collaborator
create policy "workbench_review_extraction_fields: select project members" on public.workbench_review_extraction_fields for select using (
  (auth.uid() = created_by) OR
  exists (select 1 from public.workbench_collaborators c where c.project_id = project_id and c.user_id = auth.uid() and c.status = 'accepted')
);
create policy "workbench_review_extraction_fields: insert project members" on public.workbench_review_extraction_fields for insert with check (
  (auth.uid() = created_by) OR
  exists (select 1 from public.workbench_collaborators c where c.project_id = project_id and c.user_id = auth.uid() and c.status = 'accepted')
);
create policy "workbench_review_extraction_fields: update project members" on public.workbench_review_extraction_fields for update using (
  (auth.uid() = created_by) OR
  exists (select 1 from public.workbench_collaborators c where c.project_id = project_id and c.user_id = auth.uid() and c.status = 'accepted')
) with check (
  (auth.uid() = created_by) OR
  exists (select 1 from public.workbench_collaborators c where c.project_id = project_id and c.user_id = auth.uid() and c.status = 'accepted')
);

-- extractions: any assignee, project owner, or collaborator
create policy "workbench_review_extractions: select project members" on public.workbench_review_extractions for select using (
  (auth.uid() = user_id) OR
  exists (select 1 from public.workbench_review_assignments a where a.project_id = project_id and a.record_id = record_id and a.assignee_user_id = auth.uid()) OR
  exists (select 1 from public.workbench_collaborators c where c.project_id = project_id and c.user_id = auth.uid() and c.status = 'accepted')
);
create policy "workbench_review_extractions: insert project members" on public.workbench_review_extractions for insert with check (
  (auth.uid() = user_id) OR
  exists (select 1 from public.workbench_review_assignments a where a.project_id = project_id and a.record_id = record_id and a.assignee_user_id = auth.uid()) OR
  exists (select 1 from public.workbench_collaborators c where c.project_id = project_id and c.user_id = auth.uid() and c.status = 'accepted')
);
create policy "workbench_review_extractions: update project members" on public.workbench_review_extractions for update using (
  (auth.uid() = user_id) OR
  exists (select 1 from public.workbench_review_assignments a where a.project_id = project_id and a.record_id = record_id and a.assignee_user_id = auth.uid()) OR
  exists (select 1 from public.workbench_collaborators c where c.project_id = project_id and c.user_id = auth.uid() and c.status = 'accepted')
) with check (
  (auth.uid() = user_id) OR
  exists (select 1 from public.workbench_review_assignments a where a.project_id = project_id and a.record_id = record_id and a.assignee_user_id = auth.uid()) OR
  exists (select 1 from public.workbench_collaborators c where c.project_id = project_id and c.user_id = auth.uid() and c.status = 'accepted')
);
create policy "workbench_review_extractions: delete project members" on public.workbench_review_extractions for delete using (
  (auth.uid() = user_id) OR
  exists (select 1 from public.workbench_collaborators c where c.project_id = project_id and c.user_id = auth.uid() and c.status = 'accepted')
);

-- assignments: only project collaborators may assign
create policy "workbench_review_assignments: select project members" on public.workbench_review_assignments for select using (
  exists (select 1 from public.workbench_collaborators c where c.project_id = project_id and c.user_id = auth.uid() and c.status = 'accepted')
);
create policy "workbench_review_assignments: insert project members" on public.workbench_review_assignments for insert with check (
  exists (select 1 from public.workbench_collaborators c where c.project_id = project_id and c.user_id = auth.uid() and c.status = 'accepted')
);
create policy "workbench_review_assignments: delete project members" on public.workbench_review_assignments for delete using (
  exists (select 1 from public.workbench_collaborators c where c.project_id = project_id and c.user_id = auth.uid() and c.status = 'accepted')
);

-- comments: project members can add/select/update their comments; collaborators can select/resolve
create policy "workbench_review_comments: select project members" on public.workbench_review_comments for select using (
  (auth.uid() = user_id) OR
  exists (select 1 from public.workbench_collaborators c where c.project_id = project_id and c.user_id = auth.uid() and c.status = 'accepted')
);
create policy "workbench_review_comments: insert project members" on public.workbench_review_comments for insert with check (
  (auth.uid() = user_id) OR
  exists (select 1 from public.workbench_collaborators c where c.project_id = project_id and c.user_id = auth.uid() and c.status = 'accepted')
);
create policy "workbench_review_comments: update project members" on public.workbench_review_comments for update using (
  (auth.uid() = user_id) OR
  exists (select 1 from public.workbench_collaborators c where c.project_id = project_id and c.user_id = auth.uid() and c.status = 'accepted')
) with check (
  (auth.uid() = user_id) OR
  exists (select 1 from public.workbench_collaborators c where c.project_id = project_id and c.user_id = auth.uid() and c.status = 'accepted')
);

-- touch triggers for updated_at if available (re-use project's convention)
-- rely on application to set updated_at on updates

