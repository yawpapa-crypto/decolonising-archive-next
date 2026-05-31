-- Feedback & bug reports submitted by users
create table if not exists public.feedback_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  type text not null,
  status text not null default 'new',
  priority text not null default 'normal',
  message text not null,
  page_url text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feedback_reports_type_check check (type in ('bug', 'suggestion', 'content', 'accessibility', 'other')),
  constraint feedback_reports_status_check check (status in ('new', 'reviewing', 'resolved', 'dismissed')),
  constraint feedback_reports_priority_check check (priority in ('low', 'normal', 'high', 'urgent')),
  constraint feedback_reports_message_length check (char_length(trim(message)) between 10 and 5000)
);

alter table public.feedback_reports enable row level security;

drop policy if exists "Users can insert own feedback" on public.feedback_reports;
create policy "Users can insert own feedback"
  on public.feedback_reports for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Anon can insert feedback" on public.feedback_reports;
create policy "Anon can insert feedback"
  on public.feedback_reports for insert
  to anon
  with check (user_id is null);

drop policy if exists "Admins can read all feedback" on public.feedback_reports;
create policy "Admins can read all feedback"
  on public.feedback_reports for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can update feedback" on public.feedback_reports;
create policy "Admins can update feedback"
  on public.feedback_reports for update
  to authenticated
  using (public.is_admin());

create index if not exists feedback_reports_user_id_idx on public.feedback_reports(user_id);
create index if not exists feedback_reports_type_idx on public.feedback_reports(type);
create index if not exists feedback_reports_status_idx on public.feedback_reports(status);
create index if not exists feedback_reports_created_at_idx on public.feedback_reports(created_at desc);

notify pgrst, 'reload schema';
