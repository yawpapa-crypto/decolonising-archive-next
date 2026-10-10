begin;
-- Public profile rows contain private contact columns. Share only the approved projection.
create view public.public_profiles with (security_barrier=true) as
 select id,display_name,full_name,avatar_url,short_bio,affiliation,organisation,website,profile_visibility,created_at
 from public.profiles where profile_visibility='public' or (profile_visibility='members_only' and auth.uid() is not null);
grant select on public.public_profiles to anon,authenticated;
drop policy if exists "Members can view community profiles" on public.profiles;
-- Existing owner/admin policies continue to allow account and administration workflows.
drop policy if exists "reading_list_items: read own list" on public.reading_list_items;
create policy "reading_list_items: read own list" on public.reading_list_items for select using(exists(select 1 from public.reading_lists l where l.id=reading_list_id and l.user_id=auth.uid()));
create function public.curatorial_public_records(collection_ids uuid[]) returns table(reading_list_id uuid,record_id text,sort_order integer) language sql stable security definer set search_path=public,pg_temp as $$
 select i.reading_list_id,i.record_id,i.position from public.reading_list_items i join public.reading_lists l on l.id=i.reading_list_id where l.is_public and i.reading_list_id=any(collection_ids) order by i.position limit 2000
$$;
revoke all on function public.curatorial_public_records(uuid[]) from public;
grant execute on function public.curatorial_public_records(uuid[]) to anon,authenticated;
drop policy follows_insert on public.curatorial_follows;
create policy follows_insert on public.curatorial_follows for insert to authenticated with check(user_id=auth.uid() and (
 (profile_id is not null and exists(select 1 from public.public_profiles p where p.id=profile_id and p.profile_visibility='public')) or
 (collection_id is not null and exists(select 1 from public.reading_lists l where l.id=collection_id and l.is_public))));
drop policy activity_read on public.curatorial_activity;
create policy activity_read on public.curatorial_activity for select to authenticated using (
 exists(select 1 from public.reading_lists l where l.id=collection_id and l.is_public)
 and exists(select 1 from public.curatorial_follows f where f.user_id=auth.uid() and (
 f.collection_id=curatorial_activity.collection_id or (f.profile_id=actor_id and exists(select 1 from public.public_profiles p where p.id=actor_id and p.profile_visibility='public')))));
commit;
