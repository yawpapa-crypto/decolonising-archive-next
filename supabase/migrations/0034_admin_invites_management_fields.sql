alter table public.admin_invites
add column if not exists revoked_at timestamptz,
add column if not exists revoked_by uuid,
add column if not exists revoked_reason text,
add column if not exists resent_at timestamptz,
add column if not exists resent_by uuid,
add column if not exists resend_count integer not null default 0,
add column if not exists updated_at timestamptz default now();
