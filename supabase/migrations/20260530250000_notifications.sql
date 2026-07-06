-- Notifications foundation
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint notifications_type_check check (type in ('system', 'moderation', 'community', 'admin', 'onboarding'))
);

alter table public.notifications enable row level security;

drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Admins can insert notifications" on public.notifications;
create policy "Admins can insert notifications"
  on public.notifications for insert
  to authenticated
  with check (public.is_admin() or user_id = auth.uid());

create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_read_idx on public.notifications(user_id, read);
create index if not exists notifications_created_at_idx on public.notifications(created_at desc);

notify pgrst, 'reload schema';
