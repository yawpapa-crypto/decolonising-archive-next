drop policy if exists "reading_list_items: read own list" on public.reading_list_items;

create policy "reading_list_items: read own list"
  on public.reading_list_items for select
  using (
    exists (
      select 1 from public.reading_lists rl
      where rl.id = reading_list_items.reading_list_id
        and rl.user_id = auth.uid()
    )
  );

create or replace function public.public_reading_list_items(p_reading_list_id uuid)
returns table (
  id uuid,
  reading_list_id uuid,
  record_id text,
  position integer,
  record_title text,
  record_author text,
  record_source text,
  record_source_url text,
  record_type text,
  record_year text,
  record_metadata jsonb,
  added_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    rli.id,
    rli.reading_list_id,
    rli.record_id,
    rli.position,
    rli.record_title,
    rli.record_author,
    rli.record_source,
    rli.record_source_url,
    rli.record_type,
    rli.record_year,
    rli.record_metadata,
    rli.added_at
  from public.reading_list_items rli
  join public.reading_lists rl on rl.id = rli.reading_list_id
  where rli.reading_list_id = p_reading_list_id
    and rl.is_public = true
  order by rli.position asc, rli.added_at asc;
$$;

revoke all on function public.public_reading_list_items(uuid) from public;
grant execute on function public.public_reading_list_items(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
