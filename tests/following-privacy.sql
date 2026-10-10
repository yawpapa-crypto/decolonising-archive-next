begin;
insert into auth.users(id,email) values('10000000-0000-0000-0000-000000000001','following-curator@example.invalid'),('10000000-0000-0000-0000-000000000002','following-reader@example.invalid');
update profiles set profile_visibility='public',display_name='Temporary QA curator' where id='10000000-0000-0000-0000-000000000001';
insert into reading_lists(id,user_id,title,is_public) values('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Temporary QA collection',true),('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','Private QA collection',false);
insert into reading_list_items(reading_list_id,record_id) select '20000000-0000-0000-0000-000000000001', 'qa-record-'||i from generate_series(1,5) i;
insert into reading_list_items(reading_list_id,record_id) values('20000000-0000-0000-0000-000000000002','private-record');
do $$begin
 if (select count(*) from curatorial_activity where collection_id='20000000-0000-0000-0000-000000000001' and action='added')<>1 then raise exception 'aggregation failed';end if;
 if (select cardinality(record_ids) from curatorial_activity where collection_id='20000000-0000-0000-0000-000000000001' and action='added')<>5 then raise exception 'missing grouped records';end if;
 if exists(select 1 from curatorial_activity where collection_id='20000000-0000-0000-0000-000000000002') then raise exception 'private leak';end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
insert into curatorial_follows(user_id,profile_id) values('10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001');
do $$begin if (select count(*) from curatorial_activity)<>2 then raise exception 'follow visibility failed';end if;end $$;
do $$begin
 if exists(select 1 from profiles where id='10000000-0000-0000-0000-000000000001') then raise exception 'private profile columns exposed';end if;
 if exists(select 1 from reading_list_items where reading_list_id='20000000-0000-0000-0000-000000000001') then raise exception 'private item notes exposed';end if;
 if (select count(*) from curatorial_public_records(array['20000000-0000-0000-0000-000000000001'::uuid]))<>5 then raise exception 'public projection failed';end if;
end $$;
set local role postgres;
update reading_lists set is_public=false where id='20000000-0000-0000-0000-000000000001';
set local role authenticated;
do $$begin if exists(select 1 from curatorial_activity) then raise exception 'unpublication leak';end if;end $$;
rollback;
select 'PASS: grouping, five IDs, private exclusion, explicit follows, unpublication, rollback';
