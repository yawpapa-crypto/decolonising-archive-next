-- Shared Document / Board / Canvas access via project collaborators.
-- Extends member checks (email invites) and workbench_notes RLS.

-- ----------------------------------------------------------------------------
-- Collaborator lifecycle columns
-- ----------------------------------------------------------------------------

alter table public.workbench_collaborators
  add column if not exists accepted_at timestamptz;

-- ----------------------------------------------------------------------------
-- Helpers
-- ----------------------------------------------------------------------------

create or replace function public.workbench_current_user_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select lower(trim(coalesce(
    (select email from public.profiles where id = auth.uid()),
    (select email from auth.users where id = auth.uid()),
    ''
  )));
$$;

create or replace function public.workbench_collaborator_is_active(status text)
returns boolean
language sql
immutable
as $$
  select coalesce(status, 'accepted') not in ('removed', 'declined', 'suspended');
$$;

create or replace function public.workbench_is_project_owner(project_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workbench_projects p
    where p.id = project_uuid
      and p.owner_id = auth.uid()
  );
$$;

create or replace function public.workbench_is_project_member(project_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.workbench_is_project_owner(project_uuid)
    or exists (
      select 1
      from public.workbench_collaborators c
      where c.project_id = project_uuid
        and public.workbench_collaborator_is_active(c.status)
        and (
          (c.user_id is not null and c.user_id = auth.uid())
          or (
            c.invited_email is not null
            and length(trim(c.invited_email)) > 0
            and lower(trim(c.invited_email)) = public.workbench_current_user_email()
            and length(public.workbench_current_user_email()) > 0
          )
        )
    );
$$;

create or replace function public.workbench_can_edit_project(project_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.workbench_is_project_owner(project_uuid)
    or exists (
      select 1
      from public.workbench_collaborators c
      where c.project_id = project_uuid
        and c.role = 'editor'
        and public.workbench_collaborator_is_active(c.status)
        and (
          (c.user_id is not null and c.user_id = auth.uid())
          or (
            c.invited_email is not null
            and lower(trim(c.invited_email)) = public.workbench_current_user_email()
            and length(public.workbench_current_user_email()) > 0
          )
        )
    );
$$;

create or replace function public.workbench_can_manage_project(project_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.workbench_can_edit_project(project_uuid);
$$;

create or replace function public.workbench_can_read_project(project_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.workbench_is_project_member(project_uuid)
    or exists (
      select 1
      from public.workbench_projects p
      where p.id = project_uuid
        and p.visibility = 'public'
        and auth.uid() is not null
    );
$$;

create or replace function public.workbench_can_read_note(note_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workbench_notes n
    where n.id = note_uuid
      and n.deleted_at is null
      and (
        n.user_id = auth.uid()
        or (
          n.project_id is not null
          and public.workbench_can_read_project(n.project_id)
        )
      )
  );
$$;

create or replace function public.workbench_can_edit_note(note_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workbench_notes n
    where n.id = note_uuid
      and n.deleted_at is null
      and (
        n.user_id = auth.uid()
        or (
          n.project_id is not null
          and public.workbench_can_edit_project(n.project_id)
        )
      )
  );
$$;

-- ----------------------------------------------------------------------------
-- Collaborator management: project owner only
-- ----------------------------------------------------------------------------

drop policy if exists "workbench_collaborators: insert manage" on public.workbench_collaborators;
drop policy if exists "workbench_collaborators: update manage" on public.workbench_collaborators;
drop policy if exists "workbench_collaborators: delete manage" on public.workbench_collaborators;

create policy "workbench_collaborators: insert owner"
  on public.workbench_collaborators for insert
  with check (public.workbench_is_project_owner(project_id));

create policy "workbench_collaborators: update owner"
  on public.workbench_collaborators for update
  using (public.workbench_is_project_owner(project_id))
  with check (public.workbench_is_project_owner(project_id));

create policy "workbench_collaborators: delete owner"
  on public.workbench_collaborators for delete
  using (public.workbench_is_project_owner(project_id));

-- Invited users may accept their own invite (link user_id, set accepted)
drop policy if exists "workbench_collaborators: update self accept" on public.workbench_collaborators;
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

-- ----------------------------------------------------------------------------
-- workbench_notes — project-shared read/write
-- ----------------------------------------------------------------------------

drop policy if exists "Workbench notes are readable by note owners" on public.workbench_notes;
drop policy if exists "Workbench notes are insertable by note owners" on public.workbench_notes;
drop policy if exists "Workbench notes are updateable by note owners" on public.workbench_notes;
drop policy if exists "Workbench notes are deletable by note owners" on public.workbench_notes;

create policy "workbench_notes: select owner or project member"
  on public.workbench_notes for select
  to authenticated
  using (
    deleted_at is null
    and (
      auth.uid() = user_id
      or (
        project_id is not null
        and public.workbench_can_read_project(project_id)
      )
    )
  );

create policy "workbench_notes: insert owner or project editor"
  on public.workbench_notes for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and (
      project_id is null
      or public.workbench_can_edit_project(project_id)
    )
  );

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
    and (
      project_id is null
      or public.workbench_can_edit_project(project_id)
    )
  );

create policy "workbench_notes: delete owner or project owner"
  on public.workbench_notes for delete
  to authenticated
  using (
    auth.uid() = user_id
    or (
      project_id is not null
      and public.workbench_is_project_owner(project_id)
    )
  );

notify pgrst, 'reload schema';
