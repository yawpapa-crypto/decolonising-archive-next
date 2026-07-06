-- Link Workbench projects to review workflows without affecting normal projects.

create table if not exists public.workbench_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  project_type text not null default 'custom_project',
  visibility text not null default 'private',
  status text not null default 'active',
  deadline date,
  is_curated_public boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workbench_review_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.workbench_projects(id) on delete set null,
  title text not null,
  description text,
  review_type text not null default 'systematic_review',
  research_question text,
  inclusion_criteria text,
  exclusion_criteria text,
  search_strings jsonb not null default '[]'::jsonb,
  databases_searched jsonb not null default '[]'::jsonb,
  notes text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workbench_projects
  add column if not exists description text,
  add column if not exists project_type text not null default 'custom_project',
  add column if not exists visibility text not null default 'private',
  add column if not exists status text not null default 'active',
  add column if not exists deadline date,
  add column if not exists is_curated_public boolean not null default false,
  add column if not exists notes text;

alter table public.workbench_review_projects
  add column if not exists project_id uuid references public.workbench_projects(id) on delete set null,
  add column if not exists description text,
  add column if not exists review_type text not null default 'systematic_review',
  add column if not exists research_question text,
  add column if not exists inclusion_criteria text,
  add column if not exists exclusion_criteria text,
  add column if not exists search_strings jsonb not null default '[]'::jsonb,
  add column if not exists databases_searched jsonb not null default '[]'::jsonb,
  add column if not exists notes text,
  add column if not exists status text not null default 'active';

alter table public.workbench_review_projects
  drop constraint if exists workbench_review_projects_review_type_check;

alter table public.workbench_review_projects
  add constraint workbench_review_projects_review_type_check
  check (review_type in (
    'systematic_review',
    'scoping_review',
    'rapid_review',
    'evidence_map',
    'mapping_review',
    'narrative_review'
  ));

create index if not exists workbench_review_projects_project_id_idx
  on public.workbench_review_projects (project_id)
  where project_id is not null;

create unique index if not exists workbench_review_projects_project_id_unique
  on public.workbench_review_projects (project_id)
  where project_id is not null;

alter table public.workbench_projects enable row level security;
alter table public.workbench_review_projects enable row level security;

drop policy if exists "workbench_projects: select own rows" on public.workbench_projects;
drop policy if exists "workbench_projects: insert own rows" on public.workbench_projects;
drop policy if exists "workbench_projects: update own rows" on public.workbench_projects;
drop policy if exists "workbench_projects: delete own rows" on public.workbench_projects;

create policy "workbench_projects: select own rows"
  on public.workbench_projects for select
  using (auth.uid() = owner_id);

create policy "workbench_projects: insert own rows"
  on public.workbench_projects for insert
  with check (auth.uid() = owner_id);

create policy "workbench_projects: update own rows"
  on public.workbench_projects for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "workbench_projects: delete own rows"
  on public.workbench_projects for delete
  using (auth.uid() = owner_id);

drop policy if exists "workbench_review_projects: select own or linked project" on public.workbench_review_projects;
drop policy if exists "workbench_review_projects: insert own or linked project" on public.workbench_review_projects;
drop policy if exists "workbench_review_projects: update own or linked project" on public.workbench_review_projects;
drop policy if exists "workbench_review_projects: delete own or linked project" on public.workbench_review_projects;

create policy "workbench_review_projects: select own or linked project"
  on public.workbench_review_projects for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.workbench_projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

create policy "workbench_review_projects: insert own or linked project"
  on public.workbench_review_projects for insert
  with check (
    auth.uid() = user_id
    and (
      project_id is null
      or exists (
        select 1 from public.workbench_projects p
        where p.id = project_id and p.owner_id = auth.uid()
      )
    )
  );

create policy "workbench_review_projects: update own or linked project"
  on public.workbench_review_projects for update
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.workbench_projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and (
      project_id is null
      or exists (
        select 1 from public.workbench_projects p
        where p.id = project_id and p.owner_id = auth.uid()
      )
    )
  );

create policy "workbench_review_projects: delete own or linked project"
  on public.workbench_review_projects for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.workbench_projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

grant select, insert, update, delete on table public.workbench_projects to authenticated;
grant select, insert, update, delete on table public.workbench_review_projects to authenticated;

notify pgrst, 'reload schema';
