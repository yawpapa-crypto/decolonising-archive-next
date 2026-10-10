-- Profile visibility and ownership remain governed by the existing profiles RLS.
alter table public.profiles add column if not exists social_links jsonb not null default '{}'::jsonb;
alter table public.profiles add constraint profiles_social_links_object check (jsonb_typeof(social_links) = 'object');
