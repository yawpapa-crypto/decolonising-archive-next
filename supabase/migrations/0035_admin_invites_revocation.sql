alter table public.admin_invites
add column if not exists revoked_at timestamptz,
add column if not exists revoked_by uuid,
add column if not exists revoked_reason text;
