create table if not exists public.workbench_review_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid,
  title text not null default 'Untitled review project',
  description text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workbench_review_screenings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  review_project_id uuid references public.workbench_review_projects(id) on delete cascade,
  record_id text,
  title text,
  source text,
  decision text not null default 'unscreened',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workbench_review_projects enable row level security;
alter table public.workbench_review_screenings enable row level security;

create policy if not exists "Users can manage own review projects"
on public.workbench_review_projects
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy if not exists "Users can manage own review screenings"
on public.workbench_review_screenings
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
