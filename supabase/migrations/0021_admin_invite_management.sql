-- Admin invite management metadata.
-- Adds explicit revoke/resend/edit tracking while keeping existing invite links working.

alter table public.admin_invites
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_by uuid references auth.users(id) on delete set null,
  add column if not exists resent_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists admin_invites_set_updated_at on public.admin_invites;
create trigger admin_invites_set_updated_at
  before update on public.admin_invites
  for each row execute function public.touch_profiles_updated_at();

create index if not exists admin_invites_status_idx
  on public.admin_invites (used_at, revoked_at, expires_at);
