-- Fix review RLS predicates that used unqualified project_id/record_id names.
-- In nested policy queries those names can bind to the inner table, allowing
-- any accepted collaborator row to satisfy unrelated review-project checks.

create or replace function public.workbench_review_can_manage_structure(review_project_id uuid)
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
      and c.role = 'editor'
  );
$$;

create or replace function public.workbench_review_can_contribute_to_record(
  review_project_id uuid,
  review_record_id text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.workbench_review_can_screen(review_project_id)
  or exists (
    select 1
    from public.workbench_review_assignments a
    where a.project_id = review_project_id
      and a.record_id = review_record_id
      and a.assignee_user_id = auth.uid()
  );
$$;

create or replace function public.workbench_review_field_belongs_to_project(
  review_project_id uuid,
  extraction_field_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workbench_review_extraction_fields f
    where f.id = extraction_field_id
      and f.project_id = review_project_id
  );
$$;

drop policy if exists "workbench_review_extraction_fields: select project members"
  on public.workbench_review_extraction_fields;
drop policy if exists "workbench_review_extraction_fields: insert project members"
  on public.workbench_review_extraction_fields;
drop policy if exists "workbench_review_extraction_fields: insert project managers"
  on public.workbench_review_extraction_fields;
drop policy if exists "workbench_review_extraction_fields: update project members"
  on public.workbench_review_extraction_fields;
drop policy if exists "workbench_review_extraction_fields: update project managers"
  on public.workbench_review_extraction_fields;

create policy "workbench_review_extraction_fields: select project members"
  on public.workbench_review_extraction_fields for select
  using (
    public.workbench_review_can_access(workbench_review_extraction_fields.project_id)
  );

create policy "workbench_review_extraction_fields: insert project managers"
  on public.workbench_review_extraction_fields for insert
  with check (
    auth.uid() = created_by
    and public.workbench_review_can_manage_structure(workbench_review_extraction_fields.project_id)
  );

create policy "workbench_review_extraction_fields: update project managers"
  on public.workbench_review_extraction_fields for update
  using (
    public.workbench_review_can_manage_structure(workbench_review_extraction_fields.project_id)
  )
  with check (
    public.workbench_review_can_manage_structure(workbench_review_extraction_fields.project_id)
  );

drop policy if exists "workbench_review_extractions: select project members"
  on public.workbench_review_extractions;
drop policy if exists "workbench_review_extractions: insert project members"
  on public.workbench_review_extractions;
drop policy if exists "workbench_review_extractions: insert own project contributions"
  on public.workbench_review_extractions;
drop policy if exists "workbench_review_extractions: update project members"
  on public.workbench_review_extractions;
drop policy if exists "workbench_review_extractions: update own project contributions"
  on public.workbench_review_extractions;
drop policy if exists "workbench_review_extractions: delete project members"
  on public.workbench_review_extractions;
drop policy if exists "workbench_review_extractions: delete own project contributions"
  on public.workbench_review_extractions;

create policy "workbench_review_extractions: select project members"
  on public.workbench_review_extractions for select
  using (
    public.workbench_review_can_access(workbench_review_extractions.project_id)
    or (
      auth.uid() = workbench_review_extractions.user_id
      and public.workbench_review_can_contribute_to_record(
        workbench_review_extractions.project_id,
        workbench_review_extractions.record_id
      )
    )
  );

create policy "workbench_review_extractions: insert own project contributions"
  on public.workbench_review_extractions for insert
  with check (
    auth.uid() = workbench_review_extractions.user_id
    and public.workbench_review_can_contribute_to_record(
      workbench_review_extractions.project_id,
      workbench_review_extractions.record_id
    )
    and public.workbench_review_field_belongs_to_project(
      workbench_review_extractions.project_id,
      workbench_review_extractions.field_id
    )
  );

create policy "workbench_review_extractions: update own project contributions"
  on public.workbench_review_extractions for update
  using (
    auth.uid() = workbench_review_extractions.user_id
    and public.workbench_review_can_contribute_to_record(
      workbench_review_extractions.project_id,
      workbench_review_extractions.record_id
    )
    and public.workbench_review_field_belongs_to_project(
      workbench_review_extractions.project_id,
      workbench_review_extractions.field_id
    )
  )
  with check (
    auth.uid() = workbench_review_extractions.user_id
    and public.workbench_review_can_contribute_to_record(
      workbench_review_extractions.project_id,
      workbench_review_extractions.record_id
    )
    and public.workbench_review_field_belongs_to_project(
      workbench_review_extractions.project_id,
      workbench_review_extractions.field_id
    )
  );

create policy "workbench_review_extractions: delete own project contributions"
  on public.workbench_review_extractions for delete
  using (
    auth.uid() = workbench_review_extractions.user_id
    and public.workbench_review_can_contribute_to_record(
      workbench_review_extractions.project_id,
      workbench_review_extractions.record_id
    )
  );

drop policy if exists "workbench_review_comments: select project members"
  on public.workbench_review_comments;
drop policy if exists "workbench_review_comments: insert project members"
  on public.workbench_review_comments;
drop policy if exists "workbench_review_comments: insert own project comments"
  on public.workbench_review_comments;
drop policy if exists "workbench_review_comments: update project members"
  on public.workbench_review_comments;
drop policy if exists "workbench_review_comments: update own project comments"
  on public.workbench_review_comments;

create policy "workbench_review_comments: select project members"
  on public.workbench_review_comments for select
  using (
    public.workbench_review_can_access(workbench_review_comments.project_id)
  );

create policy "workbench_review_comments: insert own project comments"
  on public.workbench_review_comments for insert
  with check (
    auth.uid() = workbench_review_comments.user_id
    and public.workbench_review_can_contribute_to_record(
      workbench_review_comments.project_id,
      workbench_review_comments.record_id
    )
  );

create policy "workbench_review_comments: update own project comments"
  on public.workbench_review_comments for update
  using (
    auth.uid() = workbench_review_comments.user_id
    and public.workbench_review_can_contribute_to_record(
      workbench_review_comments.project_id,
      workbench_review_comments.record_id
    )
  )
  with check (
    auth.uid() = workbench_review_comments.user_id
    and public.workbench_review_can_contribute_to_record(
      workbench_review_comments.project_id,
      workbench_review_comments.record_id
    )
  );

notify pgrst, 'reload schema';
