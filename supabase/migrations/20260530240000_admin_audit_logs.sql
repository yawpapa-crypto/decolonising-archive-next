-- Admin audit log for tracking admin actions
create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_logs enable row level security;

drop policy if exists "Admins can insert audit logs" on public.admin_audit_logs;
create policy "Admins can insert audit logs"
  on public.admin_audit_logs for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can read audit logs" on public.admin_audit_logs;
create policy "Admins can read audit logs"
  on public.admin_audit_logs for select
  to authenticated
  using (public.is_admin());

create index if not exists admin_audit_logs_admin_id_idx on public.admin_audit_logs(admin_id);
create index if not exists admin_audit_logs_action_idx on public.admin_audit_logs(action);
create index if not exists admin_audit_logs_created_at_idx on public.admin_audit_logs(created_at desc);

notify pgrst, 'reload schema';
