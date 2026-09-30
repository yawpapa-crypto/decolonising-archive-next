-- Fix Workbench collaboration invite acceptance and shared-note updates.

alter table public.workbench_collaborators
  drop constraint if exists workbench_collaborators_status_check;

alter table public.workbench_collaborators
  add constraint workbench_collaborators_status_check
  check (status in ('active', 'accepted', 'pending', 'invited', 'suspended', 'removed'));

create or replace function public.enforce_workbench_collaborator_invite_acceptance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_email text := public.workbench_current_user_email();
begin
  if public.workbench_is_project_owner(old.project_id) then
    return new;
  end if;

  if
    old.invited_email is not null
    and lower(trim(old.invited_email)) = current_email
    and length(current_email) > 0
    and new.user_id = auth.uid()
  then
    if
      new.id is distinct from old.id
      or new.project_id is distinct from old.project_id
      or new.invited_email is distinct from old.invited_email
      or new.role is distinct from old.role
      or new.invited_by is distinct from old.invited_by
      or new.created_at is distinct from old.created_at
    then
      raise exception 'Invite acceptance cannot change collaborator identity or role.'
        using errcode = '42501';
    end if;

    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists workbench_collaborators_enforce_invite_acceptance
  on public.workbench_collaborators;

create trigger workbench_collaborators_enforce_invite_acceptance
  before update on public.workbench_collaborators
  for each row
  execute function public.enforce_workbench_collaborator_invite_acceptance();

drop policy if exists "workbench_collaborators: update self accept"
  on public.workbench_collaborators;

create policy "workbench_collaborators: update self accept"
  on public.workbench_collaborators for update
  using (
    invited_email is not null
    and lower(trim(invited_email)) = public.workbench_current_user_email()
    and length(public.workbench_current_user_email()) > 0
    and public.workbench_collaborator_is_active(status)
  )
  with check (
    user_id = auth.uid()
    and status in ('accepted', 'active', 'pending', 'invited')
  );

create or replace function public.enforce_workbench_note_collaborator_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.user_id then
    return new;
  end if;

  if
    old.project_id is not null
    and public.workbench_can_edit_project(old.project_id)
  then
    if
      new.id is distinct from old.id
      or new.user_id is distinct from old.user_id
      or new.project_id is distinct from old.project_id
      or new.created_at is distinct from old.created_at
    then
      raise exception 'Project editors cannot change note ownership or project.'
        using errcode = '42501';
    end if;

    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists workbench_notes_enforce_collaborator_update
  on public.workbench_notes;

create trigger workbench_notes_enforce_collaborator_update
  before update on public.workbench_notes
  for each row
  execute function public.enforce_workbench_note_collaborator_update();

drop policy if exists "workbench_notes: update owner or project editor"
  on public.workbench_notes;

create policy "workbench_notes: update owner or project editor"
  on public.workbench_notes for update
  to authenticated
  using (
    deleted_at is null
    and (
      auth.uid() = user_id
      or (
        project_id is not null
        and public.workbench_can_edit_project(project_id)
      )
    )
  )
  with check (
    auth.uid() = user_id
    or (
      project_id is not null
      and public.workbench_can_edit_project(project_id)
    )
  );

notify pgrst, 'reload schema';
