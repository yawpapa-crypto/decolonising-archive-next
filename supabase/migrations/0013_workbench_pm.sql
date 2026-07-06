-- Archive Workbench — project management fields (Kanban stage, assignee label, project notes)

alter table public.workbench_projects
  add column if not exists notes text;

alter table public.workbench_tasks
  add column if not exists workflow_stage text,
  add column if not exists owner_name text,
  add column if not exists completed_at timestamptz;

alter table public.workbench_tasks
  drop constraint if exists workbench_tasks_workflow_stage_check;

alter table public.workbench_tasks
  add constraint workbench_tasks_workflow_stage_check
  check (
    workflow_stage is null
    or workflow_stage in (
      'to_review',
      'reading',
      'metadata_check',
      'rights_check',
      'cultural_review',
      'writing_annotation',
      'ready_to_publish',
      'completed'
    )
  );

comment on column public.workbench_tasks.workflow_stage is
  'Explicit Kanban column for the task; when null, derive from review_type + status.';
comment on column public.workbench_tasks.owner_name is
  'Display name for task owner / assignee (free text; complements assigned_to uuid).';
comment on column public.workbench_projects.notes is
  'Project-level research notes (not per-record).';
