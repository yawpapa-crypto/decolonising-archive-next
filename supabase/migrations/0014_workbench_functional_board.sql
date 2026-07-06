-- Archive Workbench — functional board status support and ordering fields

alter table public.workbench_tasks
  add column if not exists group_key text,
  add column if not exists position integer not null default 0,
  add column if not exists completed_at timestamptz,
  add column if not exists owner_name text;

alter table public.workbench_tasks
  drop constraint if exists workbench_tasks_status_check;

alter table public.workbench_tasks
  add constraint workbench_tasks_status_check
  check (status in ('todo', 'in_progress', 'waiting', 'done', 'stuck', 'needs_review'));

create index if not exists workbench_tasks_project_status_position_idx
  on public.workbench_tasks (project_id, status, position, due_date);

comment on column public.workbench_tasks.group_key is
  'Optional UI grouping key for board/table views.';

comment on column public.workbench_tasks.position is
  'Manual ordering position for board/table views.';
