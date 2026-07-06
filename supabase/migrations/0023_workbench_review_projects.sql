-- Systematic / scoping review projects and per-record screening workflow

create table if not exists public.workbench_review_projects (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  title               text not null,
  review_type         text not null default 'systematic_review'
    check (review_type in ('systematic_review', 'scoping_review', 'mapping_review', 'narrative_review')),
  research_question   text,
  inclusion_criteria  text,
  exclusion_criteria  text,
  search_strings      jsonb not null default '[]'::jsonb,
  databases_searched  jsonb not null default '[]'::jsonb,
  date_range_start    date,
  date_range_end      date,
  notes               text,
  status              text not null default 'active' check (status in ('active', 'paused', 'completed')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists workbench_review_projects_user_idx
  on public.workbench_review_projects (user_id, updated_at desc);

drop trigger if exists workbench_review_projects_set_updated_at on public.workbench_review_projects;
create trigger workbench_review_projects_set_updated_at
  before update on public.workbench_review_projects
  for each row execute function public.touch_profiles_updated_at();

create table if not exists public.workbench_review_screenings (
  id                  uuid primary key default gen_random_uuid(),
  review_project_id   uuid not null references public.workbench_review_projects(id) on delete cascade,
  user_id             uuid not null references auth.users(id) on delete cascade,
  record_id           text not null,
  screening_status    text not null default 'imported'
    check (screening_status in (
      'imported',
      'title_abstract_screening',
      'included',
      'excluded',
      'full_text_review',
      'final_included'
    )),
  exclusion_reason    text
    check (exclusion_reason is null or exclusion_reason in (
      'wrong_topic',
      'wrong_geography',
      'wrong_method',
      'duplicate',
      'no_full_text',
      'outside_date_range',
      'other'
    )),
  notes               text,
  duplicate_of        text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (review_project_id, record_id, user_id)
);

create index if not exists workbench_review_screenings_project_idx
  on public.workbench_review_screenings (review_project_id, screening_status);

create index if not exists workbench_review_screenings_user_idx
  on public.workbench_review_screenings (user_id, updated_at desc);

drop trigger if exists workbench_review_screenings_set_updated_at on public.workbench_review_screenings;
create trigger workbench_review_screenings_set_updated_at
  before update on public.workbench_review_screenings
  for each row execute function public.touch_profiles_updated_at();

alter table public.workbench_review_projects enable row level security;
alter table public.workbench_review_screenings enable row level security;

drop policy if exists "workbench_review_projects: select own" on public.workbench_review_projects;
drop policy if exists "workbench_review_projects: insert own" on public.workbench_review_projects;
drop policy if exists "workbench_review_projects: update own" on public.workbench_review_projects;
drop policy if exists "workbench_review_projects: delete own" on public.workbench_review_projects;

create policy "workbench_review_projects: select own"
  on public.workbench_review_projects for select using (auth.uid() = user_id);
create policy "workbench_review_projects: insert own"
  on public.workbench_review_projects for insert with check (auth.uid() = user_id);
create policy "workbench_review_projects: update own"
  on public.workbench_review_projects for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "workbench_review_projects: delete own"
  on public.workbench_review_projects for delete using (auth.uid() = user_id);

drop policy if exists "workbench_review_screenings: select own" on public.workbench_review_screenings;
drop policy if exists "workbench_review_screenings: insert own" on public.workbench_review_screenings;
drop policy if exists "workbench_review_screenings: update own" on public.workbench_review_screenings;
drop policy if exists "workbench_review_screenings: delete own" on public.workbench_review_screenings;

create policy "workbench_review_screenings: select own"
  on public.workbench_review_screenings for select using (auth.uid() = user_id);
create policy "workbench_review_screenings: insert own"
  on public.workbench_review_screenings for insert with check (auth.uid() = user_id);
create policy "workbench_review_screenings: update own"
  on public.workbench_review_screenings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "workbench_review_screenings: delete own"
  on public.workbench_review_screenings for delete using (auth.uid() = user_id);

-- Allow users to clear their own research activity
drop policy if exists "workbench_activity_events: delete own" on public.workbench_activity_events;
create policy "workbench_activity_events: delete own"
  on public.workbench_activity_events for delete
  using (auth.uid() = user_id);
