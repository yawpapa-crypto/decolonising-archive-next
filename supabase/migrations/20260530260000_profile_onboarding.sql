-- Add onboarding and beta notice columns to profiles
alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists beta_notice_seen boolean not null default false;

notify pgrst, 'reload schema';
