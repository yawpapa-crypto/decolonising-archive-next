-- Dedicated Workbench Reviews module hardening.
-- This reconciles earlier review migrations and adds durable review workflow tables.

alter table public.workbench_review_projects
  add column if not exists project_id uuid references public.workbench_projects(id) on delete set null,
  add column if not exists description text,
  add column if not exists review_type text not null default 'systematic_review',
  add column if not exists research_question text,
  add column if not exists inclusion_criteria text,
  add column if not exists exclusion_criteria text,
  add column if not exists search_strings jsonb not null default '[]'::jsonb,
  add column if not exists databases_searched jsonb not null default '[]'::jsonb,
  add column if not exists date_range_start date,
  add column if not exists date_range_end date,
  add column if not exists notes text,
  add column if not exists protocol_notes text,
  add column if not exists eligibility_criteria jsonb not null default '{}'::jsonb,
  add column if not exists languages text[] not null default '{}'::text[],
  add column if not exists review_method text,
  add column if not exists source_scope text,
  add column if not exists reporting_snapshot jsonb not null default '{}'::jsonb;

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

alter table public.workbench_review_screenings
  add column if not exists screening_status text not null default 'imported',
  add column if not exists exclusion_reason text,
  add column if not exists duplicate_of text,
  add column if not exists title text,
  add column if not exists source text,
  add column if not exists decision text not null default 'unscreened',
  add column if not exists reviewer_id uuid references auth.users(id) on delete set null,
  add column if not exists assigned_to uuid references auth.users(id) on delete set null,
  add column if not exists conflict_status text not null default 'none',
  add column if not exists full_text_url text,
  add column if not exists full_text_status text not null default 'not_sought',
  add column if not exists updated_at timestamptz not null default now();

alter table public.workbench_review_screenings
  drop constraint if exists workbench_review_screenings_screening_status_check;

alter table public.workbench_review_screenings
  add constraint workbench_review_screenings_screening_status_check
  check (screening_status in (
    'imported',
    'title_abstract_screening',
    'included',
    'excluded',
    'maybe',
    'full_text_review',
    'final_included'
  ));

create table if not exists public.workbench_review_records (
  id uuid primary key default gen_random_uuid(),
  review_project_id uuid not null references public.workbench_review_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  record_id text not null,
  title text,
  authors text,
  year text,
  doi text,
  source_url text,
  source_label text,
  record_type text,
  import_source text not null default 'manual',
  source_metadata jsonb not null default '{}'::jsonb,
  dedupe_key text,
  duplicate_of uuid references public.workbench_review_records(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workbench_review_records_import_source_check
    check (import_source in ('saved_record', 'reading_list', 'library_search', 'manual', 'project_record')),
  unique (review_project_id, record_id)
);

create index if not exists workbench_review_records_project_idx
  on public.workbench_review_records (review_project_id, created_at desc);
create index if not exists workbench_review_records_dedupe_idx
  on public.workbench_review_records (review_project_id, dedupe_key)
  where dedupe_key is not null;

create table if not exists public.workbench_review_decisions (
  id uuid primary key default gen_random_uuid(),
  review_project_id uuid not null references public.workbench_review_projects(id) on delete cascade,
  review_record_id uuid references public.workbench_review_records(id) on delete cascade,
  record_id text not null,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  stage text not null,
  decision text not null,
  exclusion_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workbench_review_decisions_stage_check
    check (stage in ('title_abstract', 'full_text', 'extraction', 'conflict_resolution')),
  constraint workbench_review_decisions_decision_check
    check (decision in ('include', 'exclude', 'maybe', 'not_sure', 'pending')),
  unique (review_project_id, record_id, reviewer_id, stage)
);

create index if not exists workbench_review_decisions_project_idx
  on public.workbench_review_decisions (review_project_id, stage, decision);

create table if not exists public.workbench_review_conflicts (
  id uuid primary key default gen_random_uuid(),
  review_project_id uuid not null references public.workbench_review_projects(id) on delete cascade,
  record_id text not null,
  stage text not null,
  status text not null default 'open',
  resolver_id uuid references auth.users(id) on delete set null,
  resolution_decision text,
  resolution_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workbench_review_conflicts_stage_check
    check (stage in ('title_abstract', 'full_text', 'extraction')),
  constraint workbench_review_conflicts_status_check
    check (status in ('open', 'resolved', 'deferred')),
  constraint workbench_review_conflicts_resolution_decision_check
    check (resolution_decision is null or resolution_decision in ('include', 'exclude', 'maybe')),
  unique (review_project_id, record_id, stage)
);

create index if not exists workbench_review_conflicts_project_idx
  on public.workbench_review_conflicts (review_project_id, status);

create table if not exists public.workbench_review_full_texts (
  id uuid primary key default gen_random_uuid(),
  review_project_id uuid not null references public.workbench_review_projects(id) on delete cascade,
  record_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  url text,
  file_label text,
  access_status text not null default 'not_sought',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workbench_review_full_texts_access_status_check
    check (access_status in ('not_sought', 'found', 'uploaded', 'unavailable')),
  unique (review_project_id, record_id)
);

create index if not exists workbench_review_full_texts_project_idx
  on public.workbench_review_full_texts (review_project_id, access_status);

alter table public.workbench_review_records enable row level security;
alter table public.workbench_review_decisions enable row level security;
alter table public.workbench_review_conflicts enable row level security;
alter table public.workbench_review_full_texts enable row level security;

drop policy if exists "workbench_review_records: manage own project" on public.workbench_review_records;
create policy "workbench_review_records: manage own project"
  on public.workbench_review_records for all
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.workbench_review_projects p
      where p.id = review_project_id and p.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.workbench_review_projects p
      where p.id = review_project_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "workbench_review_decisions: manage own project" on public.workbench_review_decisions;
create policy "workbench_review_decisions: manage own project"
  on public.workbench_review_decisions for all
  using (
    auth.uid() = reviewer_id
    or exists (
      select 1 from public.workbench_review_projects p
      where p.id = review_project_id and p.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = reviewer_id
    or exists (
      select 1 from public.workbench_review_projects p
      where p.id = review_project_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "workbench_review_conflicts: manage own project" on public.workbench_review_conflicts;
create policy "workbench_review_conflicts: manage own project"
  on public.workbench_review_conflicts for all
  using (
    exists (
      select 1 from public.workbench_review_projects p
      where p.id = review_project_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workbench_review_projects p
      where p.id = review_project_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "workbench_review_full_texts: manage own project" on public.workbench_review_full_texts;
create policy "workbench_review_full_texts: manage own project"
  on public.workbench_review_full_texts for all
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.workbench_review_projects p
      where p.id = review_project_id and p.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.workbench_review_projects p
      where p.id = review_project_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "workbench_review_extraction_fields: select project members" on public.workbench_review_extraction_fields;
drop policy if exists "workbench_review_extraction_fields: insert project members" on public.workbench_review_extraction_fields;
drop policy if exists "workbench_review_extraction_fields: update project members" on public.workbench_review_extraction_fields;

create policy "workbench_review_extraction_fields: select project members"
  on public.workbench_review_extraction_fields for select
  using (
    auth.uid() = created_by
    or exists (
      select 1 from public.workbench_review_projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
    or exists (
      select 1 from public.workbench_collaborators c
      where c.project_id = project_id and c.user_id = auth.uid() and c.status = 'accepted'
    )
  );

create policy "workbench_review_extraction_fields: insert project members"
  on public.workbench_review_extraction_fields for insert
  with check (
    auth.uid() = created_by
    or exists (
      select 1 from public.workbench_review_projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
    or exists (
      select 1 from public.workbench_collaborators c
      where c.project_id = project_id and c.user_id = auth.uid() and c.status = 'accepted'
    )
  );

create policy "workbench_review_extraction_fields: update project members"
  on public.workbench_review_extraction_fields for update
  using (
    auth.uid() = created_by
    or exists (
      select 1 from public.workbench_review_projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
    or exists (
      select 1 from public.workbench_collaborators c
      where c.project_id = project_id and c.user_id = auth.uid() and c.status = 'accepted'
    )
  )
  with check (
    auth.uid() = created_by
    or exists (
      select 1 from public.workbench_review_projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
    or exists (
      select 1 from public.workbench_collaborators c
      where c.project_id = project_id and c.user_id = auth.uid() and c.status = 'accepted'
    )
  );

drop policy if exists "workbench_review_extractions: select project members" on public.workbench_review_extractions;
drop policy if exists "workbench_review_extractions: insert project members" on public.workbench_review_extractions;
drop policy if exists "workbench_review_extractions: update project members" on public.workbench_review_extractions;
drop policy if exists "workbench_review_extractions: delete project members" on public.workbench_review_extractions;

create policy "workbench_review_extractions: select project members"
  on public.workbench_review_extractions for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.workbench_review_projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
    or exists (
      select 1 from public.workbench_review_assignments a
      where a.project_id = project_id and a.record_id = record_id and a.assignee_user_id = auth.uid()
    )
    or exists (
      select 1 from public.workbench_collaborators c
      where c.project_id = project_id and c.user_id = auth.uid() and c.status = 'accepted'
    )
  );

create policy "workbench_review_extractions: insert project members"
  on public.workbench_review_extractions for insert
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.workbench_review_projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
    or exists (
      select 1 from public.workbench_review_assignments a
      where a.project_id = project_id and a.record_id = record_id and a.assignee_user_id = auth.uid()
    )
    or exists (
      select 1 from public.workbench_collaborators c
      where c.project_id = project_id and c.user_id = auth.uid() and c.status = 'accepted'
    )
  );

create policy "workbench_review_extractions: update project members"
  on public.workbench_review_extractions for update
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.workbench_review_projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
    or exists (
      select 1 from public.workbench_review_assignments a
      where a.project_id = project_id and a.record_id = record_id and a.assignee_user_id = auth.uid()
    )
    or exists (
      select 1 from public.workbench_collaborators c
      where c.project_id = project_id and c.user_id = auth.uid() and c.status = 'accepted'
    )
  )
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.workbench_review_projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
    or exists (
      select 1 from public.workbench_review_assignments a
      where a.project_id = project_id and a.record_id = record_id and a.assignee_user_id = auth.uid()
    )
    or exists (
      select 1 from public.workbench_collaborators c
      where c.project_id = project_id and c.user_id = auth.uid() and c.status = 'accepted'
    )
  );

create policy "workbench_review_extractions: delete project members"
  on public.workbench_review_extractions for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.workbench_review_projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
    or exists (
      select 1 from public.workbench_collaborators c
      where c.project_id = project_id and c.user_id = auth.uid() and c.status = 'accepted'
    )
  );

drop policy if exists "workbench_review_assignments: select project members" on public.workbench_review_assignments;
drop policy if exists "workbench_review_assignments: insert project members" on public.workbench_review_assignments;
drop policy if exists "workbench_review_assignments: delete project members" on public.workbench_review_assignments;

create policy "workbench_review_assignments: select project members"
  on public.workbench_review_assignments for select
  using (
    exists (
      select 1 from public.workbench_review_projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
    or exists (
      select 1 from public.workbench_collaborators c
      where c.project_id = project_id and c.user_id = auth.uid() and c.status = 'accepted'
    )
  );

create policy "workbench_review_assignments: insert project members"
  on public.workbench_review_assignments for insert
  with check (
    exists (
      select 1 from public.workbench_review_projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
    or exists (
      select 1 from public.workbench_collaborators c
      where c.project_id = project_id and c.user_id = auth.uid() and c.status = 'accepted'
    )
  );

create policy "workbench_review_assignments: delete project members"
  on public.workbench_review_assignments for delete
  using (
    exists (
      select 1 from public.workbench_review_projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
    or exists (
      select 1 from public.workbench_collaborators c
      where c.project_id = project_id and c.user_id = auth.uid() and c.status = 'accepted'
    )
  );

drop policy if exists "workbench_review_comments: select project members" on public.workbench_review_comments;
drop policy if exists "workbench_review_comments: insert project members" on public.workbench_review_comments;
drop policy if exists "workbench_review_comments: update project members" on public.workbench_review_comments;

create policy "workbench_review_comments: select project members"
  on public.workbench_review_comments for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.workbench_review_projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
    or exists (
      select 1 from public.workbench_collaborators c
      where c.project_id = project_id and c.user_id = auth.uid() and c.status = 'accepted'
    )
  );

create policy "workbench_review_comments: insert project members"
  on public.workbench_review_comments for insert
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.workbench_review_projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
    or exists (
      select 1 from public.workbench_collaborators c
      where c.project_id = project_id and c.user_id = auth.uid() and c.status = 'accepted'
    )
  );

create policy "workbench_review_comments: update project members"
  on public.workbench_review_comments for update
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.workbench_review_projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
    or exists (
      select 1 from public.workbench_collaborators c
      where c.project_id = project_id and c.user_id = auth.uid() and c.status = 'accepted'
    )
  )
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.workbench_review_projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
    or exists (
      select 1 from public.workbench_collaborators c
      where c.project_id = project_id and c.user_id = auth.uid() and c.status = 'accepted'
    )
  );

grant select, insert, update, delete on table public.workbench_review_projects to authenticated;
grant select, insert, update, delete on table public.workbench_review_screenings to authenticated;
grant select, insert, update, delete on table public.workbench_review_records to authenticated;
grant select, insert, update, delete on table public.workbench_review_decisions to authenticated;
grant select, insert, update, delete on table public.workbench_review_conflicts to authenticated;
grant select, insert, update, delete on table public.workbench_review_full_texts to authenticated;
grant select, insert, update, delete on table public.workbench_review_extraction_fields to authenticated;
grant select, insert, update, delete on table public.workbench_review_extractions to authenticated;
grant select, insert, update, delete on table public.workbench_review_assignments to authenticated;
grant select, insert, update, delete on table public.workbench_review_comments to authenticated;

notify pgrst, 'reload schema';
