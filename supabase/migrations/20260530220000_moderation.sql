-- General content moderation tables (beyond community_reports which exists in community migration)

create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  target_type text not null,
  target_id uuid not null,
  action text not null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint moderation_actions_target_type_check check (target_type in ('community_report', 'feedback_report', 'user', 'post', 'comment')),
  constraint moderation_actions_action_check check (action in ('dismiss', 'resolve', 'warn', 'restrict', 'ban', 'remove', 'restore'))
);

alter table public.moderation_actions enable row level security;

drop policy if exists "Admins can manage moderation_actions" on public.moderation_actions;
create policy "Admins can manage moderation_actions"
  on public.moderation_actions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists moderation_actions_admin_id_idx on public.moderation_actions(admin_id);
create index if not exists moderation_actions_target_idx on public.moderation_actions(target_type, target_id);
create index if not exists moderation_actions_created_at_idx on public.moderation_actions(created_at desc);

notify pgrst, 'reload schema';
