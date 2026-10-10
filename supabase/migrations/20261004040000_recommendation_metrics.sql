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
