-- Stabilise Workbench Notes / Document comments.
-- Keep this separate from Community Reading Commons comments.

create table if not exists public.workbench_project_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.workbench_projects(id) on delete cascade,
  note_id uuid references public.workbench_notes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  resolved boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  anchor_id text,
  anchor_type text,
  anchor_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workbench_project_comments
  add column if not exists note_id uuid references public.workbench_notes(id) on delete cascade,
  add column if not exists resolved boolean not null default false,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists anchor_id text,
  add column if not exists anchor_type text,
  add column if not exists anchor_label text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'workbench_project_comments_body_not_blank'
      and conrelid = 'public.workbench_project_comments'::regclass
  ) then
    alter table public.workbench_project_comments
      add constraint workbench_project_comments_body_not_blank
      check (char_length(trim(body)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'workbench_project_comments_anchor_type_check'
      and conrelid = 'public.workbench_project_comments'::regclass
  ) then
    alter table public.workbench_project_comments
      add constraint workbench_project_comments_anchor_type_check
      check (
        anchor_type is null
        or anchor_type in ('document', 'board', 'canvas', 'project')
      );
  end if;
end $$;

create index if not exists workbench_project_comments_project_created_idx
  on public.workbench_project_comments (project_id, created_at desc);

create index if not exists workbench_project_comments_note_created_idx
  on public.workbench_project_comments (note_id, created_at desc)
  where note_id is not null;

create index if not exists workbench_project_comments_anchor_id_idx
  on public.workbench_project_comments (anchor_id)
  where anchor_id is not null;

drop trigger if exists workbench_project_comments_touch_updated_at on public.workbench_project_comments;
create trigger workbench_project_comments_touch_updated_at
  before update on public.workbench_project_comments
  for each row
  execute function public.set_updated_at();

-- Compatibility helpers used by newer RLS policies. These aliases deliberately
-- point at the canonical Workbench collaborator helpers used by the app.
create or replace function public.is_workbench_project_owner(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.workbench_is_project_owner(target_project_id);
$$;

create or replace function public.is_workbench_project_member(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.workbench_is_project_member(target_project_id);
$$;

create or replace function public.can_view_workbench_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.workbench_can_read_project(target_project_id);
$$;

create or replace function public.can_edit_workbench_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.workbench_can_edit_project(target_project_id);
$$;

alter table public.workbench_project_comments enable row level security;

drop policy if exists "workbench_project_comments: select member" on public.workbench_project_comments;
drop policy if exists "workbench_project_comments: insert member" on public.workbench_project_comments;
drop policy if exists "workbench_project_comments: update own" on public.workbench_project_comments;
drop policy if exists "workbench_project_comments: delete own" on public.workbench_project_comments;
drop policy if exists "Project participants can view workbench comments" on public.workbench_project_comments;
drop policy if exists "Project editors can create workbench comments" on public.workbench_project_comments;
drop policy if exists "Comment authors and project editors can update comments" on public.workbench_project_comments;
drop policy if exists "Comment authors and project owners can delete comments" on public.workbench_project_comments;

create policy "Project participants can view workbench comments"
  on public.workbench_project_comments for select
  using (public.can_view_workbench_project(project_id));

create policy "Project editors can create workbench comments"
  on public.workbench_project_comments for insert
  with check (
    auth.uid() = user_id
    and public.can_edit_workbench_project(project_id)
  );

create policy "Comment authors and project editors can update comments"
  on public.workbench_project_comments for update
  using (
    auth.uid() = user_id
    or public.can_edit_workbench_project(project_id)
  )
  with check (
    auth.uid() = user_id
    or public.can_edit_workbench_project(project_id)
  );

create policy "Comment authors and project owners can delete comments"
  on public.workbench_project_comments for delete
  using (
    auth.uid() = user_id
    or public.is_workbench_project_owner(project_id)
  );

grant select on public.workbench_project_comments to authenticated;
grant insert, update, delete on public.workbench_project_comments to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'workbench_project_comments'
  ) then
    alter publication supabase_realtime add table public.workbench_project_comments;
  end if;
end $$;

notify pgrst, 'reload schema';
