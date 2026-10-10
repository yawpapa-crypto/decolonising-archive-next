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
