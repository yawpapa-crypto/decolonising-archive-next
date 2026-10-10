begin;
create function public.touch_curatorial_collection_clock() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 update public.reading_lists set updated_at=now() where id=case when tg_op='DELETE' then old.reading_list_id else new.reading_list_id end;
 if tg_op='DELETE' then return old; else return new; end if;
end $$;
revoke all on function public.touch_curatorial_collection_clock() from public;
create trigger reading_item_touch_collection after insert or delete on public.reading_list_items for each row execute function public.touch_curatorial_collection_clock();
commit;
