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
