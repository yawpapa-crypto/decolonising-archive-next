-- Allow linked Workbench collaborators to access review workflows (screening, decisions, conflicts).

create or replace function public.workbench_review_linked_workbench_project_id(review_project_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select project_id
  from public.workbench_review_projects
  where id = review_project_id
  limit 1;
$$;

create or replace function public.workbench_review_can_access(review_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workbench_review_projects rp
    where rp.id = review_project_id
      and rp.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.workbench_review_projects rp
    join public.workbench_collaborators c on c.project_id = rp.project_id
    where rp.id = review_project_id
      and c.user_id = auth.uid()
      and c.status = 'accepted'
  );
$$;

create or replace function public.workbench_review_can_screen(review_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workbench_review_projects rp
    where rp.id = review_project_id
      and rp.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.workbench_review_projects rp
    join public.workbench_collaborators c on c.project_id = rp.project_id
    where rp.id = review_project_id
      and c.user_id = auth.uid()
      and c.status = 'accepted'
      and c.role in ('reviewer', 'editor')
  );
$$;

-- Linked workbench projects: collaborators can read shared project metadata.
drop policy if exists "workbench_projects: select collaborators" on public.workbench_projects;
create policy "workbench_projects: select collaborators"
  on public.workbench_projects for select
  using (
    auth.uid() = owner_id
    or exists (
      select 1
      from public.workbench_collaborators c
      where c.project_id = id
        and c.user_id = auth.uid()
        and c.status = 'accepted'
    )
  );

-- Review projects: owner or accepted collaborator on linked workbench project.
drop policy if exists "workbench_review_projects: select own or linked project" on public.workbench_review_projects;
create policy "workbench_review_projects: select own or linked project"
  on public.workbench_review_projects for select
  using (public.workbench_review_can_access(id));

-- Screenings: per-reviewer rows; collaborators with reviewer/editor role can manage their own queue.
drop policy if exists "workbench_review_screenings: select own" on public.workbench_review_screenings;
drop policy if exists "workbench_review_screenings: insert own" on public.workbench_review_screenings;
drop policy if exists "workbench_review_screenings: update own" on public.workbench_review_screenings;
drop policy if exists "workbench_review_screenings: delete own" on public.workbench_review_screenings;

create policy "workbench_review_screenings: select project members"
  on public.workbench_review_screenings for select
  using (
    auth.uid() = user_id
    and public.workbench_review_can_screen(review_project_id)
  );

create policy "workbench_review_screenings: insert project members"
  on public.workbench_review_screenings for insert
  with check (
    auth.uid() = user_id
    and public.workbench_review_can_screen(review_project_id)
  );

create policy "workbench_review_screenings: update project members"
  on public.workbench_review_screenings for update
  using (
    auth.uid() = user_id
    and public.workbench_review_can_screen(review_project_id)
  )
  with check (
    auth.uid() = user_id
    and public.workbench_review_can_screen(review_project_id)
  );

create policy "workbench_review_screenings: delete project members"
  on public.workbench_review_screenings for delete
  using (
    auth.uid() = user_id
    and public.workbench_review_can_access(review_project_id)
  );

-- Decisions: reviewers write their own; owners can read all project decisions.
drop policy if exists "workbench_review_decisions: manage own project" on public.workbench_review_decisions;
create policy "workbench_review_decisions: select project members"
  on public.workbench_review_decisions for select
  using (public.workbench_review_can_access(review_project_id));

create policy "workbench_review_decisions: insert reviewers"
  on public.workbench_review_decisions for insert
  with check (
    auth.uid() = reviewer_id
    and public.workbench_review_can_screen(review_project_id)
  );

create policy "workbench_review_decisions: update reviewers"
  on public.workbench_review_decisions for update
  using (
    auth.uid() = reviewer_id
    and public.workbench_review_can_screen(review_project_id)
  )
  with check (
    auth.uid() = reviewer_id
    and public.workbench_review_can_screen(review_project_id)
  );

create policy "workbench_review_decisions: delete reviewers"
  on public.workbench_review_decisions for delete
  using (
    auth.uid() = reviewer_id
    and public.workbench_review_can_screen(review_project_id)
  );

-- Conflicts: readable by project members; writable by owner or editor collaborators.
drop policy if exists "workbench_review_conflicts: manage own project" on public.workbench_review_conflicts;
create policy "workbench_review_conflicts: select project members"
  on public.workbench_review_conflicts for select
  using (public.workbench_review_can_access(review_project_id));

create policy "workbench_review_conflicts: insert project members"
  on public.workbench_review_conflicts for insert
  with check (public.workbench_review_can_screen(review_project_id));

create policy "workbench_review_conflicts: update project members"
  on public.workbench_review_conflicts for update
  using (public.workbench_review_can_screen(review_project_id))
  with check (public.workbench_review_can_screen(review_project_id));

-- Records: collaborators can read shared corpus; owner imports.
drop policy if exists "workbench_review_records: manage own project" on public.workbench_review_records;
create policy "workbench_review_records: select project members"
  on public.workbench_review_records for select
  using (public.workbench_review_can_access(review_project_id));

create policy "workbench_review_records: insert project owner"
  on public.workbench_review_records for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.workbench_review_projects p
      where p.id = review_project_id and p.user_id = auth.uid()
    )
  );

create policy "workbench_review_records: update project owner"
  on public.workbench_review_records for update
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.workbench_review_projects p
      where p.id = review_project_id and p.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.workbench_review_projects p
      where p.id = review_project_id and p.user_id = auth.uid()
    )
  );

-- Fix assignments RLS: join collaborators through linked workbench project id.
drop policy if exists "workbench_review_assignments: select project members" on public.workbench_review_assignments;
drop policy if exists "workbench_review_assignments: insert project members" on public.workbench_review_assignments;
drop policy if exists "workbench_review_assignments: delete project members" on public.workbench_review_assignments;

create policy "workbench_review_assignments: select project members"
  on public.workbench_review_assignments for select
  using (
    exists (
      select 1 from public.workbench_review_projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.workbench_review_projects rp
      join public.workbench_collaborators c on c.project_id = rp.project_id
      where rp.id = project_id
        and c.user_id = auth.uid()
        and c.status = 'accepted'
    )
  );

create policy "workbench_review_assignments: insert project members"
  on public.workbench_review_assignments for insert
  with check (
    exists (
      select 1 from public.workbench_review_projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.workbench_review_projects rp
      join public.workbench_collaborators c on c.project_id = rp.project_id
      where rp.id = project_id
        and c.user_id = auth.uid()
        and c.status = 'accepted'
        and c.role in ('editor', 'reviewer')
    )
  );

create policy "workbench_review_assignments: delete project members"
  on public.workbench_review_assignments for delete
  using (
    exists (
      select 1 from public.workbench_review_projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.workbench_review_projects rp
      join public.workbench_collaborators c on c.project_id = rp.project_id
      where rp.id = project_id
        and c.user_id = auth.uid()
        and c.status = 'accepted'
        and c.role = 'editor'
    )
  );

notify pgrst, 'reload schema';
