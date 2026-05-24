-- 0033_workbench_project_comments_anchor_fields.sql
-- Adds anchor fields for comments attached to document/canvas/board objects.

alter table public.workbench_project_comments
add column if not exists anchor_id text,
add column if not exists anchor_type text,
add column if not exists anchor_label text;

create index if not exists workbench_project_comments_anchor_id_idx
  on public.workbench_project_comments(anchor_id);

notify pgrst, 'reload schema';
