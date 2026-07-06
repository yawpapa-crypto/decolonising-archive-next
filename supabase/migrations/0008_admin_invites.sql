create table if not exists public.admin_invites (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  email text,
  role text not null default 'admin',
  label text,
  created_by uuid references auth.users(id) on delete set null,
  used_by uuid references auth.users(id) on delete set null,
  used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint admin_invites_role_check check (role in ('admin', 'curator'))
);

create index if not exists admin_invites_token_idx
  on public.admin_invites (token);

create index if not exists admin_invites_created_at_idx
  on public.admin_invites (created_at desc);

alter table public.admin_invites enable row level security;

drop policy if exists "admin_invites: admin read" on public.admin_invites;
drop policy if exists "admin_invites: admin insert" on public.admin_invites;
drop policy if exists "admin_invites: admin update" on public.admin_invites;
drop policy if exists "admin_invites: admin delete" on public.admin_invites;

create policy "admin_invites: admin read"
  on public.admin_invites for select to authenticated
  using (public.is_admin());

create policy "admin_invites: admin insert"
  on public.admin_invites for insert to authenticated
  with check (public.is_admin() and created_by = auth.uid());

create policy "admin_invites: admin update"
  on public.admin_invites for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin_invites: admin delete"
  on public.admin_invites for delete to authenticated
  using (public.is_admin());
