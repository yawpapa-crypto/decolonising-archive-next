create table if not exists public.workbench_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.workbench_projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  title text not null default 'Untitled note',
  content_html text,
  content_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workbench_notes_user_id_idx
  on public.workbench_notes(user_id);

create index if not exists workbench_notes_project_id_idx
  on public.workbench_notes(project_id);

create index if not exists workbench_notes_updated_at_idx
  on public.workbench_notes(updated_at desc);

alter table public.workbench_notes enable row level security;

drop policy if exists "Workbench notes are readable by note owners" on public.workbench_notes;
create policy "Workbench notes are readable by note owners"
on public.workbench_notes
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Workbench notes are insertable by note owners" on public.workbench_notes;
create policy "Workbench notes are insertable by note owners"
on public.workbench_notes
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Workbench notes are updateable by note owners" on public.workbench_notes;
create policy "Workbench notes are updateable by note owners"
on public.workbench_notes
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Workbench notes are deletable by note owners" on public.workbench_notes;
create policy "Workbench notes are deletable by note owners"
on public.workbench_notes
for delete
to authenticated
using (auth.uid() = user_id);
