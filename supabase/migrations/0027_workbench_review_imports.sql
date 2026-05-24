-- Import history and archived review status for the Workbench Reviews module.

alter table public.workbench_review_projects
  drop constraint if exists workbench_review_projects_status_check;

alter table public.workbench_review_projects
  add constraint workbench_review_projects_status_check
  check (status in ('active', 'paused', 'completed', 'archived'));

alter table public.workbench_review_records
  drop constraint if exists workbench_review_records_import_source_check;

alter table public.workbench_review_records
  add constraint workbench_review_records_import_source_check
  check (import_source in (
    'saved_record',
    'reading_list',
    'library_search',
    'manual',
    'project_record',
    'file_import'
  ));

create table if not exists public.workbench_review_imports (
  id uuid primary key default gen_random_uuid(),
  review_project_id uuid not null references public.workbench_review_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  filename text,
  file_format text,
  import_target text not null default 'title_abstract_screening',
  source_label text,
  status text not null default 'success',
  error_message text,
  references_count integer not null default 0,
  duplicates_count integer not null default 0,
  merged_count integer not null default 0,
  added_to_screening_count integer not null default 0,
  created_at timestamptz not null default now(),
  constraint workbench_review_imports_status_check
    check (status in ('success', 'failed', 'partial')),
  constraint workbench_review_imports_target_check
    check (import_target in ('title_abstract_screening', 'full_text_review', 'extraction'))
);

create index if not exists workbench_review_imports_project_idx
  on public.workbench_review_imports (review_project_id, created_at desc);

alter table public.workbench_review_imports enable row level security;

drop policy if exists "workbench_review_imports: select own project" on public.workbench_review_imports;
drop policy if exists "workbench_review_imports: insert own project" on public.workbench_review_imports;
drop policy if exists "workbench_review_imports: update own project" on public.workbench_review_imports;
drop policy if exists "workbench_review_imports: delete own project" on public.workbench_review_imports;

create policy "workbench_review_imports: select own project"
  on public.workbench_review_imports for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.workbench_review_projects rp
      where rp.id = review_project_id and rp.user_id = auth.uid()
    )
  );

create policy "workbench_review_imports: insert own project"
  on public.workbench_review_imports for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.workbench_review_projects rp
      where rp.id = review_project_id and rp.user_id = auth.uid()
    )
  );

create policy "workbench_review_imports: update own project"
  on public.workbench_review_imports for update
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.workbench_review_projects rp
      where rp.id = review_project_id and rp.user_id = auth.uid()
    )
  );

create policy "workbench_review_imports: delete own project"
  on public.workbench_review_imports for delete
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.workbench_review_projects rp
      where rp.id = review_project_id and rp.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on table public.workbench_review_imports to authenticated;

notify pgrst, 'reload schema';
