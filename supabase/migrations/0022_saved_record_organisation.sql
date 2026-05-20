alter table public.reading_lists
  add column if not exists group_type text default 'theme',
  add column if not exists group_label text;

alter table public.bookmarks
  add column if not exists record_title text,
  add column if not exists record_source text,
  add column if not exists record_source_url text,
  add column if not exists record_type text,
  add column if not exists record_year text,
  add column if not exists record_metadata jsonb default '{}'::jsonb;

create index if not exists reading_lists_group_type_idx
  on public.reading_lists (user_id, group_type, created_at desc);

create index if not exists bookmarks_record_type_idx
  on public.bookmarks (user_id, record_type, created_at desc);
