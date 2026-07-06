alter table public.workbench_collaborators
add column if not exists status text not null default 'active';

alter table public.workbench_collaborators
drop constraint if exists workbench_collaborators_status_check;

alter table public.workbench_collaborators
add constraint workbench_collaborators_status_check
check (status in ('active', 'pending', 'invited', 'suspended', 'removed'));

notify pgrst, 'reload schema';
