create table if not exists public.workbench_review_imports (
  id uuid primary key default gen_random_uuid(),
  review_project_id uuid references public.workbench_review_projects(id) on delete cascade,
  project_id uuid references public.workbench_projects(id) on delete set null,
  user_id uuid references auth.users(id) on delete cascade,
  file_name text,
  file_type text,
  source_label text,
  import_source text not null default 'file',
  status text not null default 'completed',
  error_message text,
  total_references integer not null default 0,
  added_to_screening integer not null default 0,
  duplicates_found integer not null default 0,
  merged_count integer not null default 0,
  failed_count integer not null default 0,
  raw_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workbench_review_imports enable row level security;

drop policy if exists "Users can manage own review imports" on public.workbench_review_imports;

create policy "Users can manage own review imports"
on public.workbench_review_imports
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists workbench_review_imports_project_idx
on public.workbench_review_imports (review_project_id, created_at desc);

notify pgrst, 'reload schema';
