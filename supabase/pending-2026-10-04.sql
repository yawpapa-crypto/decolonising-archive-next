-- ===== supabase/migrations/20261004000000_curatorial_following.sql =====
begin;
create table public.curatorial_follows (
 user_id uuid not null references auth.users(id) on delete cascade,
 profile_id uuid references public.profiles(id) on delete cascade,
 collection_id uuid references public.reading_lists(id) on delete cascade,
 created_at timestamptz not null default now(),
 check ((profile_id is not null)::int + (collection_id is not null)::int = 1)
);
create unique index curatorial_follow_profile on public.curatorial_follows(user_id,profile_id) where profile_id is not null;
create unique index curatorial_follow_collection on public.curatorial_follows(user_id,collection_id) where collection_id is not null;
alter table public.curatorial_follows enable row level security;
create policy follows_read on public.curatorial_follows for select to authenticated using(user_id=auth.uid());
create policy follows_delete on public.curatorial_follows for delete to authenticated using(user_id=auth.uid());
create policy follows_insert on public.curatorial_follows for insert to authenticated with check(user_id=auth.uid() and (
 (profile_id is not null and exists(select 1 from public.profiles p where p.id=profile_id and p.profile_visibility='public')) or
 (collection_id is not null and exists(select 1 from public.reading_lists l where l.id=collection_id and l.is_public))));
grant select,insert,delete on public.curatorial_follows to authenticated;
create table public.curatorial_activity (
 id uuid primary key default gen_random_uuid(),
 actor_id uuid not null references public.profiles(id) on delete cascade,
 collection_id uuid not null references public.reading_lists(id) on delete cascade,
 action text not null check(action in ('published','updated','added')),
 record_ids text[] not null default '{}',
 occurred_at timestamptz not null default now(),
 bucket timestamptz not null,
 unique(actor_id,collection_id,action,bucket)
);
create index curatorial_activity_cursor on public.curatorial_activity(occurred_at desc,id desc);
alter table public.curatorial_activity enable row level security;
create policy activity_read on public.curatorial_activity for select to authenticated using (
 exists(select 1 from public.reading_lists l where l.id=collection_id and l.is_public)
 and exists(select 1 from public.curatorial_follows f where f.user_id=auth.uid() and (
 f.collection_id=curatorial_activity.collection_id or (f.profile_id=actor_id and exists(select 1 from public.profiles p where p.id=actor_id and p.profile_visibility='public')))));
grant select on public.curatorial_activity to authenticated;
create function public.capture_curatorial_activity() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare l public.reading_lists; a text; ids text[]; b timestamptz;
begin
 if tg_table_name='reading_list_items' then
  select * into l from public.reading_lists where id=new.reading_list_id;
  a:='added'; ids:=array[new.record_id];
 else
  l:=new; ids:='{}';
  if tg_op='INSERT' then a:='published';
  elsif not old.is_public and new.is_public then a:='published';
  elsif old.title is distinct from new.title or old.description is distinct from new.description then a:='updated';
  else return new; end if;
 end if;
 if not l.is_public then return new; end if;
 -- Publication is explicit collection consent. Never copy item snapshots or private notes into events.
 b:=to_timestamp(floor(extract(epoch from now())/1800)*1800);
 insert into public.curatorial_activity(actor_id,collection_id,action,record_ids,bucket)
 values(l.user_id,l.id,a,ids,b)
 on conflict(actor_id,collection_id,action,bucket) do update
 set record_ids=(select array_agg(distinct x) from unnest(curatorial_activity.record_ids || excluded.record_ids) x);
 return new;
end $$;
revoke all on function public.capture_curatorial_activity() from public;
create trigger reading_list_public_activity after insert or update on public.reading_lists for each row execute function public.capture_curatorial_activity();
create trigger reading_item_public_activity after insert on public.reading_list_items for each row execute function public.capture_curatorial_activity();
-- Safe projection even when a public collection belongs to a private profile.
create function public.curatorial_actors(ids uuid[]) returns table(id uuid,name text,avatar text,bio text,website text) language sql stable security definer set search_path=public,pg_temp as $$
 select p.id,coalesce(nullif(p.display_name,''),nullif(p.full_name,''),'Curator'),p.avatar_url,p.short_bio,p.website
 from public.profiles p where p.id=any(ids) and p.profile_visibility='public'
$$;
revoke all on function public.curatorial_actors(uuid[]) from public;
grant execute on function public.curatorial_actors(uuid[]) to anon,authenticated;
commit;

-- ===== supabase/migrations/20261004010000_curatorial_public_projection.sql =====
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

-- ===== supabase/migrations/20261004020000_curatorial_collection_clock.sql =====
begin;
create function public.touch_curatorial_collection_clock() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 update public.reading_lists set updated_at=now() where id=case when tg_op='DELETE' then old.reading_list_id else new.reading_list_id end;
 if tg_op='DELETE' then return old; else return new; end if;
end $$;
revoke all on function public.touch_curatorial_collection_clock() from public;
create trigger reading_item_touch_collection after insert or delete on public.reading_list_items for each row execute function public.touch_curatorial_collection_clock();
commit;

-- ===== supabase/migrations/20261004030000_recommendation_events.sql =====
begin;
-- Reuse existing telemetry storage without granting reads of private admin analytics.
create index if not exists recommendation_owner_recent on public.user_activity_events(user_id,created_at desc) where area='recommendation';
create or replace function public.recommendation_events()
returns table(event_type text,target_id text,session_id text,metadata jsonb,created_at timestamptz)
language sql stable security definer set search_path=public as $$
 select e.event_type,e.target_id,e.session_id,jsonb_build_object('terms',e.metadata->'terms'),e.created_at
 from public.user_activity_events e where e.user_id=auth.uid() and e.area='recommendation'
 and e.created_at>now()-interval '90 days' and e.event_type in ('rec_record_open','rec_related_record_open','rec_source_open','rec_more','rec_less','rec_search')
 order by e.created_at desc limit 500;
$$;
create or replace function public.recommendation_event(p_type text,p_target text,p_session text default null,p_terms jsonb default '[]'::jsonb)
returns boolean language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then return false; end if;
 if p_type not in ('rec_record_open','rec_related_record_open','rec_source_open','rec_more','rec_less','rec_search') or length(coalesce(p_target,''))>160 or length(coalesce(p_session,''))>64 or jsonb_typeof(p_terms)<>'array' or jsonb_array_length(p_terms)>12 or length(p_terms::text)>1500 then raise exception 'Invalid recommendation event'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 if exists(select 1 from user_activity_events where user_id=auth.uid() and area='recommendation' and event_type=p_type and target_id=p_target and created_at>now()-interval '1 minute') then return true;end if;
 if p_type in ('rec_more','rec_less') then delete from user_activity_events where user_id=auth.uid() and area='recommendation' and target_id=p_target and event_type in ('rec_more','rec_less');end if;
 insert into user_activity_events(user_id,event_type,area,target_id,session_id,metadata) values(auth.uid(),p_type,'recommendation',p_target,p_session,jsonb_build_object('terms',p_terms));
 delete from user_activity_events where user_id=auth.uid() and area='recommendation' and (created_at<now()-interval '90 days' or id in(select id from user_activity_events where user_id=auth.uid() and area='recommendation' order by created_at desc offset 1000));
 return true;
end;$$;
create or replace function public.clear_recommendation_events() returns void language sql security definer set search_path=public as $$ delete from user_activity_events where user_id=auth.uid() and area='recommendation'; $$;
revoke all on function public.recommendation_events(),public.recommendation_event(text,text,text,jsonb),public.clear_recommendation_events() from public,anon;
grant execute on function public.recommendation_events(),public.recommendation_event(text,text,text,jsonb),public.clear_recommendation_events() to authenticated;
commit;

-- ===== supabase/migrations/20261004040000_recommendation_metrics.sql =====
begin;
create or replace function public.recommendation_event(p_type text,p_target text,p_session text default null,p_terms jsonb default '[]'::jsonb)
returns boolean language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then return false; end if;
 if p_type not in ('rec_record_open','rec_related_record_open','rec_source_open','rec_more','rec_less','rec_search','rec_delivery') or length(coalesce(p_target,''))>160 or length(coalesce(p_session,''))>64 or jsonb_typeof(p_terms)<>'array' or jsonb_array_length(p_terms)>12 or length(p_terms::text)>1500 then raise exception 'Invalid recommendation event'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 if exists(select 1 from user_activity_events where user_id=auth.uid() and area='recommendation' and event_type=p_type and target_id=p_target and created_at>now()-interval '1 minute') then return true;end if;
 if p_type in ('rec_more','rec_less') then delete from user_activity_events where user_id=auth.uid() and area='recommendation' and target_id=p_target and event_type in ('rec_more','rec_less');end if;
 insert into user_activity_events(user_id,event_type,area,target_id,session_id,metadata) values(auth.uid(),p_type,'recommendation',p_target,p_session,jsonb_build_object('terms',p_terms));
 delete from user_activity_events where user_id=auth.uid() and area='recommendation' and (created_at<now()-interval '90 days' or id in(select id from user_activity_events where user_id=auth.uid() and area='recommendation' order by created_at desc offset 1000));
 return true;
end;$$;

-- Authoritative state changes from web or app; no duplicate behavioural weighting.
create or replace function public.record_recommendation_state() returns trigger language plpgsql security definer set search_path=public as $$
declare owner_id uuid; target text; kind text;
begin
 if tg_table_name='bookmarks' then
  if tg_op='DELETE' then owner_id=old.user_id;target=old.record_id;kind='rec_unsave';else owner_id=new.user_id;target=new.record_id;kind='rec_save';end if;
 elsif tg_table_name='reading_list_items' then
  if tg_op='DELETE' then select user_id into owner_id from reading_lists where id=old.reading_list_id;target=old.record_id;kind='rec_collection_remove';else select user_id into owner_id from reading_lists where id=new.reading_list_id;target=new.record_id;kind='rec_collection_add';end if;
 else
  if tg_op='DELETE' then owner_id=old.user_id;target=coalesce(old.profile_id,old.collection_id)::text;kind='rec_unfollow';else owner_id=new.user_id;target=coalesce(new.profile_id,new.collection_id)::text;kind='rec_follow';end if;
 end if;
 if owner_id is not null then
  insert into user_activity_events(user_id,event_type,area,target_id) values(owner_id,kind,'recommendation',target);
  delete from user_activity_events where user_id=owner_id and area='recommendation' and (created_at<now()-interval '90 days' or id in(select id from user_activity_events where user_id=owner_id and area='recommendation' order by created_at desc offset 1000));
 end if;
 return null;
end;$$;
revoke all on function public.record_recommendation_state() from public;
create trigger recommendation_bookmark_change after insert or delete on public.bookmarks for each row execute function public.record_recommendation_state();
create trigger recommendation_collection_change after insert or delete on public.reading_list_items for each row execute function public.record_recommendation_state();
create trigger recommendation_follow_change after insert or delete on public.curatorial_follows for each row execute function public.record_recommendation_state();
create or replace function public.recommendation_metrics() returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('delivered',coalesce(sum(case when event_type='rec_delivery' and target_id ~ '^[0-9]{1,3}$' then target_id::int else 0 end),0),
 'save',count(*)filter(where event_type='rec_save'),'collection_add',count(*)filter(where event_type='rec_collection_add'),'follow',count(*)filter(where event_type='rec_follow'),'source_open',count(*)filter(where event_type='rec_source_open'),'related_record_open',count(*)filter(where event_type='rec_related_record_open'),'negative',count(*)filter(where event_type='rec_less'))
 from user_activity_events where user_id=auth.uid() and area='recommendation' and created_at>now()-interval '90 days';
$$;
revoke all on function public.recommendation_metrics() from public,anon;
grant execute on function public.recommendation_metrics() to authenticated;
commit;

-- ===== supabase/migrations/20261004050000_ared_events.sql =====
begin;
-- Extends the existing recommendation telemetry with the eight ARED events. Same table, same 90 day window, same privacy rules.
create or replace function public.recommendation_events()
returns table(event_type text,target_id text,session_id text,metadata jsonb,created_at timestamptz)
language sql stable security definer set search_path=public as $$
 select e.event_type,e.target_id,e.session_id,jsonb_build_object('terms',e.metadata->'terms'),e.created_at
 from public.user_activity_events e where e.user_id=auth.uid() and e.area='recommendation'
 and e.created_at>now()-interval '90 days' and (e.event_type in ('rec_record_open','rec_related_record_open','rec_source_open','rec_more','rec_less','rec_search') or e.event_type like 'ared\_%')
 order by e.created_at desc limit 500;
$$;
create or replace function public.recommendation_event(p_type text,p_target text,p_session text default null,p_terms jsonb default '[]'::jsonb)
returns boolean language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then return false; end if;
 if not (p_type in ('rec_record_open','rec_related_record_open','rec_source_open','rec_more','rec_less','rec_search','ared_follow','ared_save','ared_collection_add','ared_record_open','ared_source_open','ared_profile_open','ared_search','ared_less_like_this'))
    or length(coalesce(p_target,''))>160 or length(coalesce(p_session,''))>64 or jsonb_typeof(p_terms)<>'array' or jsonb_array_length(p_terms)>12 or length(p_terms::text)>1500 then raise exception 'Invalid recommendation event'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 if exists(select 1 from user_activity_events where user_id=auth.uid() and area='recommendation' and event_type=p_type and target_id=p_target and created_at>now()-interval '1 minute') then return true;end if;
 if p_type in ('rec_more','rec_less') then delete from user_activity_events where user_id=auth.uid() and area='recommendation' and target_id=p_target and event_type in ('rec_more','rec_less');end if;
 insert into user_activity_events(user_id,event_type,area,target_id,session_id,metadata) values(auth.uid(),p_type,'recommendation',p_target,p_session,jsonb_build_object('terms',p_terms));
 delete from user_activity_events where user_id=auth.uid() and area='recommendation' and (created_at<now()-interval '90 days' or id in(select id from user_activity_events where user_id=auth.uid() and area='recommendation' order by created_at desc offset 1000));
 return true;
end;$$;
revoke all on function public.recommendation_events(),public.recommendation_event(text,text,text,jsonb) from public,anon;
grant execute on function public.recommendation_events(),public.recommendation_event(text,text,text,jsonb) to authenticated;
commit;

-- ===== supabase/migrations/20261004060000_visual_assets.sql =====
-- Canonical store for resolved visuals. Postgres stays the source of truth; any search or vector
-- engine is a rebuildable projection of this table. Written by the offline resolver, read by feeds.
create table if not exists public.visual_assets (
  id bigserial primary key,
  record_key text not null,                -- ARED record id, or canonical external id
  image_key text not null,                 -- canonical image key (see lib/visual/index-store.ts)
  is_primary boolean not null default false,
  provider text not null,
  source_url text,
  record_url text,
  image_url text not null,
  provider_id text,
  licence text,
  attribution text,
  retrieved_at timestamptz not null default now(),
  match_confidence real not null default 1 check (match_confidence between 0 and 1),
  resolver_method text not null,
  width int,
  height int,
  dhash text,                              -- 64-bit difference hash, hex
  sha1 text,
  hue smallint,
  lum real,
  failed_at timestamptz,
  canonical_of bigint references public.visual_assets(id),
  unique (record_key, image_key)
);
create index if not exists visual_assets_record on public.visual_assets (record_key);
create index if not exists visual_assets_dhash on public.visual_assets (dhash);
create index if not exists visual_assets_sha1 on public.visual_assets (sha1);
alter table public.visual_assets enable row level security;
drop policy if exists visual_assets_read on public.visual_assets;
create policy visual_assets_read on public.visual_assets for select using (failed_at is null);
-- Writes are service-role only (no insert/update policy).

