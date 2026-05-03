alter table public.reading_list_items
  add column if not exists record_title text,
  add column if not exists record_author text,
  add column if not exists record_source text,
  add column if not exists record_source_url text,
  add column if not exists record_type text,
  add column if not exists record_year text,
  add column if not exists record_metadata jsonb default '{}'::jsonb;
