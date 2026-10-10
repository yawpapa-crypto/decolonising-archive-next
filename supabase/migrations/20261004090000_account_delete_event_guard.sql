-- Cascade deletion must not create activity for an identity being removed.
begin;
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
 if owner_id is not null and exists(select 1 from auth.users where id=owner_id) and exists(select 1 from public.profiles where id=owner_id) then
  insert into user_activity_events(user_id,event_type,area,target_id) values(owner_id,kind,'recommendation',target);
  delete from user_activity_events where user_id=owner_id and area='recommendation' and (created_at<now()-interval '90 days' or id in(select id from user_activity_events where user_id=owner_id and area='recommendation' order by created_at desc offset 1000));
 end if;
 return null;
end;$$;
revoke all on function public.record_recommendation_state() from public;
create or replace function public.branch_collection(source_id uuid,allowed_ids text[]) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare original public.reading_lists; target uuid;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select * into original from public.reading_lists where id=source_id and (is_public or user_id=auth.uid()) and coalesce(description,'') not like '[field-tombstone:%' for share;
 if original.id is null then raise exception 'Collection unavailable'; end if;
 insert into public.reading_lists(user_id,title,description,is_public) values(auth.uid(),left(original.title||' — my copy',120),original.description,false) returning id into target;
 insert into public.reading_list_items(reading_list_id,record_id,position,record_title,record_source,record_source_url,record_type,record_year,record_metadata) select target,record_id,position,record_title,record_source,record_source_url,record_type,record_year,record_metadata from public.reading_list_items where reading_list_id=source_id and record_id=any(allowed_ids);
 insert into public.collection_editions(collection_id,document,derived_from) select target,document,source_id from public.collection_editions where collection_id=source_id;
 return target;
end $$;
commit;
