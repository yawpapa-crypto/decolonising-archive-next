-- Admin notifications, notification settings, and email report queue.
-- Admins only: protected by public.is_admin().
-- No normal-user access. No private document content stored here.

-- ---------------------------------------------------------------------------
-- 1. admin_notifications
-- ---------------------------------------------------------------------------
create table if not exists public.admin_notifications (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        references auth.users(id) on delete cascade,
  type        text        not null,
  title       text        not null,
  body        text,
  severity    text        not null default 'info',
  status      text        not null default 'unread',
  target_type text,
  target_id   text,
  metadata    jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  read_at     timestamptz,
  constraint admin_notifications_severity_check check (
    severity in ('info', 'success', 'warning', 'urgent')
  ),
  constraint admin_notifications_status_check check (
    status in ('unread', 'read', 'archived')
  )
);

create index if not exists admin_notifications_user_id_idx
  on public.admin_notifications (user_id, created_at desc);
create index if not exists admin_notifications_status_idx
  on public.admin_notifications (user_id, status);
create index if not exists admin_notifications_severity_idx
  on public.admin_notifications (severity, status);

alter table public.admin_notifications enable row level security;

drop policy if exists "Admins read own notifications" on public.admin_notifications;
create policy "Admins read own notifications"
  on public.admin_notifications for select
  to authenticated
  using (public.is_admin() and user_id = auth.uid());

drop policy if exists "Admins update own notifications" on public.admin_notifications;
create policy "Admins update own notifications"
  on public.admin_notifications for update
  to authenticated
  using (public.is_admin() and user_id = auth.uid())
  with check (public.is_admin() and user_id = auth.uid());

drop policy if exists "Service role inserts admin notifications" on public.admin_notifications;
create policy "Service role inserts admin notifications"
  on public.admin_notifications for insert
  to authenticated
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. admin_notification_settings
-- ---------------------------------------------------------------------------
create table if not exists public.admin_notification_settings (
  id                        uuid    primary key default gen_random_uuid(),
  user_id                   uuid    not null references auth.users(id) on delete cascade,
  dashboard_enabled         boolean not null default true,
  email_enabled             boolean not null default false,
  immediate_email_enabled   boolean not null default false,
  daily_digest_enabled      boolean not null default true,
  weekly_digest_enabled     boolean not null default true,
  digest_time               text    not null default '09:00',
  timezone                  text    not null default 'Australia/Melbourne',
  notify_errors             boolean not null default true,
  notify_feedback           boolean not null default true,
  notify_moderation         boolean not null default true,
  notify_source_requests    boolean not null default true,
  notify_user_activity      boolean not null default false,
  notify_search_trends      boolean not null default true,
  notify_workbench_activity boolean not null default false,
  notify_community_activity boolean not null default true,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint admin_notification_settings_user_id_key unique (user_id)
);

create index if not exists admin_notification_settings_user_id_idx
  on public.admin_notification_settings (user_id);

alter table public.admin_notification_settings enable row level security;

drop policy if exists "Admins manage own notification settings" on public.admin_notification_settings;
create policy "Admins manage own notification settings"
  on public.admin_notification_settings for all
  to authenticated
  using (public.is_admin() and user_id = auth.uid())
  with check (public.is_admin() and user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. admin_email_reports
-- ---------------------------------------------------------------------------
create table if not exists public.admin_email_reports (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        references auth.users(id) on delete set null,
  report_type   text        not null,
  subject       text        not null,
  body          text        not null,
  status        text        not null default 'pending',
  sent_to       text,
  sent_at       timestamptz,
  error_message text,
  metadata      jsonb       not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  constraint admin_email_reports_report_type_check check (
    report_type in ('immediate_alert', 'daily_digest', 'weekly_digest', 'manual_report')
  ),
  constraint admin_email_reports_status_check check (
    status in ('pending', 'sent', 'failed', 'skipped')
  )
);

create index if not exists admin_email_reports_user_id_idx
  on public.admin_email_reports (user_id, created_at desc);
create index if not exists admin_email_reports_status_idx
  on public.admin_email_reports (status, created_at desc);

alter table public.admin_email_reports enable row level security;

drop policy if exists "Admins read own email reports" on public.admin_email_reports;
create policy "Admins read own email reports"
  on public.admin_email_reports for select
  to authenticated
  using (public.is_admin() and user_id = auth.uid());

drop policy if exists "Admins insert email reports" on public.admin_email_reports;
create policy "Admins insert email reports"
  on public.admin_email_reports for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins update own email reports" on public.admin_email_reports;
create policy "Admins update own email reports"
  on public.admin_email_reports for update
  to authenticated
  using (public.is_admin() and user_id = auth.uid())
  with check (public.is_admin() and user_id = auth.uid());

notify pgrst, 'reload schema';
