alter table public.submitted_content
  add column if not exists related_record_id text,
  add column if not exists related_reading_list_id uuid references public.reading_lists(id) on delete set null,
  add column if not exists visibility text;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.submitted_content'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%content_type%'
  loop
    execute format('alter table public.submitted_content drop constraint %I', constraint_name);
  end loop;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.submitted_content'::regclass
      and conname = 'submitted_content_type_check'
  ) then
    alter table public.submitted_content
      add constraint submitted_content_type_check
      check (
        content_type in (
          'record',
          'source',
          'correction',
          'community_note',
          'source_suggestion',
          'record_correction',
          'contextual_reflection',
          'rights_concern',
          'broken_link',
          'event_resource',
          'shared_reading_list',
          'other'
        )
      );
  end if;
end $$;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.submitted_content'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%review_status%'
  loop
    execute format('alter table public.submitted_content drop constraint %I', constraint_name);
  end loop;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.submitted_content'::regclass
      and conname = 'submitted_content_review_status_check'
  ) then
    alter table public.submitted_content
      add constraint submitted_content_review_status_check
      check (
        review_status in (
          'submitted',
          'pending',
          'in_review',
          'accepted',
          'approved',
          'declined',
          'rejected',
          'needs_more_information',
          'resolved'
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.submitted_content'::regclass
      and conname = 'submitted_content_visibility_check'
  ) then
    alter table public.submitted_content
      add constraint submitted_content_visibility_check
      check (visibility is null or visibility in ('private', 'members', 'public'));
  end if;
end $$;

create index if not exists submitted_content_reading_list_idx
  on public.submitted_content (related_reading_list_id);

drop policy if exists "submitted_content: read approved shared reading lists" on public.submitted_content;
create policy "submitted_content: read approved shared reading lists"
  on public.submitted_content for select
  using (
    content_type = 'shared_reading_list'
    and review_status in ('accepted', 'approved', 'resolved')
  );
