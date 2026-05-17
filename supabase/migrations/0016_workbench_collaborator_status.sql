-- Pending / accepted / removed lifecycle for email invitations.

alter table public.workbench_collaborators
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'accepted', 'removed')),
  add column if not exists invited_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

update public.workbench_collaborators
set status = 'accepted'
where user_id is not null
  and status = 'pending';

drop trigger if exists workbench_collaborators_set_updated_at on public.workbench_collaborators;
create trigger workbench_collaborators_set_updated_at
  before update on public.workbench_collaborators
  for each row execute function public.touch_profiles_updated_at();
