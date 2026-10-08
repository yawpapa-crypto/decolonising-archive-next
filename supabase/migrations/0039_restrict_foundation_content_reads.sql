-- Raw CMS JSON can include draft and admin-only fields. Keep access behind
-- server routes/service-role clients instead of exposing it through PostgREST.

alter table public.records enable row level security;
alter table public.sources enable row level security;
alter table public.collections enable row level security;
alter table public.settings enable row level security;
alter table public.site_content enable row level security;

drop policy if exists "records: public read" on public.records;
drop policy if exists "sources: public read" on public.sources;
drop policy if exists "collections: public read" on public.collections;
drop policy if exists "settings: public read" on public.settings;
drop policy if exists "site_content: public read" on public.site_content;

revoke select on table
  public.records,
  public.sources,
  public.collections,
  public.settings,
  public.site_content
from anon, authenticated;

notify pgrst, 'reload schema';
