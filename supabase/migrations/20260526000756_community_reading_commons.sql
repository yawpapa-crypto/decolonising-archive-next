-- Community Reading Commons: calm public/community sharing for posts, comments,
-- attachments, tags, and moderation reports.

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text,
  title text not null,
  body text not null,
  visibility text not null default 'public',
  status text not null default 'published',
  comment_count integer not null default 0,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_posts_visibility_check check (visibility in ('public', 'community', 'private')),
  constraint community_posts_status_check check (status in ('draft', 'published', 'hidden', 'deleted')),
  constraint community_posts_title_length check (char_length(trim(title)) between 3 and 180),
  constraint community_posts_body_length check (char_length(trim(body)) between 3 and 12000)
);

alter table public.community_posts
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists author_name text,
  add column if not exists title text,
  add column if not exists body text,
  add column if not exists visibility text default 'public',
  add column if not exists status text default 'published',
  add column if not exists comment_count integer not null default 0,
  add column if not exists last_activity_at timestamptz not null default now(),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text,
  body text not null,
  status text not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_comments_status_check check (status in ('published', 'hidden', 'deleted')),
  constraint community_comments_body_length check (char_length(trim(body)) between 1 and 5000)
);

create table if not exists public.community_post_attachments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  attachment_type text not null,
  record_id text,
  reading_list_id uuid references public.reading_lists(id) on delete set null,
  title text,
  source_label text,
  record_type text,
  source_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint community_post_attachments_type_check check (attachment_type in ('saved_record', 'reading_list', 'external_source')),
  constraint community_post_attachments_target_check check (
    (attachment_type = 'saved_record' and record_id is not null)
    or (attachment_type = 'reading_list' and reading_list_id is not null)
    or (attachment_type = 'external_source' and source_url is not null)
  )
);

create table if not exists public.community_tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  description text,
  created_at timestamptz not null default now(),
  constraint community_tags_slug_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table if not exists public.community_post_tags (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  tag_id uuid not null references public.community_tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, tag_id)
);

create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id uuid not null,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'open',
  moderator_id uuid references auth.users(id) on delete set null,
  moderator_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint community_reports_target_type_check check (target_type in ('post', 'comment')),
  constraint community_reports_status_check check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  constraint community_reports_reason_length check (char_length(trim(reason)) between 3 and 160)
);

create index if not exists community_posts_feed_idx
  on public.community_posts (status, visibility, last_activity_at desc, created_at desc);
create index if not exists community_posts_user_idx
  on public.community_posts (user_id, status, updated_at desc);
create index if not exists community_comments_post_idx
  on public.community_comments (post_id, status, created_at asc);
create index if not exists community_comments_user_idx
  on public.community_comments (user_id, created_at desc);
create index if not exists community_post_attachments_post_idx
  on public.community_post_attachments (post_id, attachment_type);
create index if not exists community_post_attachments_record_idx
  on public.community_post_attachments (record_id);
create index if not exists community_post_attachments_reading_list_idx
  on public.community_post_attachments (reading_list_id);
create index if not exists community_post_tags_tag_idx
  on public.community_post_tags (tag_id, post_id);
create index if not exists community_reports_status_idx
  on public.community_reports (status, created_at desc);
create index if not exists community_reports_target_idx
  on public.community_reports (target_type, target_id);

create or replace function public.touch_community_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists community_posts_touch_updated_at on public.community_posts;
create trigger community_posts_touch_updated_at
  before update on public.community_posts
  for each row execute function public.touch_community_updated_at();

drop trigger if exists community_comments_touch_updated_at on public.community_comments;
create trigger community_comments_touch_updated_at
  before update on public.community_comments
  for each row execute function public.touch_community_updated_at();

alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_post_attachments enable row level security;
alter table public.community_tags enable row level security;
alter table public.community_post_tags enable row level security;
alter table public.community_reports enable row level security;

-- Community posts ---------------------------------------------------------
drop policy if exists "community_posts: public read published" on public.community_posts;
drop policy if exists "community_posts: owner admin read" on public.community_posts;
drop policy if exists "community_posts: authenticated insert own" on public.community_posts;
drop policy if exists "community_posts: owner update own" on public.community_posts;
drop policy if exists "community_posts: admin update any" on public.community_posts;
drop policy if exists "community_posts: owner delete own" on public.community_posts;
drop policy if exists "community_posts: admin delete any" on public.community_posts;

create policy "community_posts: public read published"
  on public.community_posts for select
  using (status = 'published' and visibility in ('public', 'community'));

create policy "community_posts: owner admin read"
  on public.community_posts for select
  using (auth.uid() = user_id or public.is_admin());

create policy "community_posts: authenticated insert own"
  on public.community_posts for insert
  with check (
    auth.uid() = user_id
    and status in ('draft', 'published')
    and visibility in ('public', 'community', 'private')
  );

create policy "community_posts: owner update own"
  on public.community_posts for update
  using (auth.uid() = user_id and status <> 'deleted')
  with check (
    auth.uid() = user_id
    and status in ('draft', 'published', 'deleted')
    and visibility in ('public', 'community', 'private')
  );

create policy "community_posts: admin update any"
  on public.community_posts for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "community_posts: owner delete own"
  on public.community_posts for delete
  using (auth.uid() = user_id);

create policy "community_posts: admin delete any"
  on public.community_posts for delete
  using (public.is_admin());

-- Comments ---------------------------------------------------------------
drop policy if exists "community_comments: read visible post comments" on public.community_comments;
drop policy if exists "community_comments: owner admin read" on public.community_comments;
drop policy if exists "community_comments: authenticated insert visible post" on public.community_comments;
drop policy if exists "community_comments: owner update own" on public.community_comments;
drop policy if exists "community_comments: admin update any" on public.community_comments;
drop policy if exists "community_comments: owner delete own" on public.community_comments;
drop policy if exists "community_comments: admin delete any" on public.community_comments;

create policy "community_comments: read visible post comments"
  on public.community_comments for select
  using (
    status = 'published'
    and exists (
      select 1 from public.community_posts post
      where post.id = community_comments.post_id
        and post.status = 'published'
        and post.visibility in ('public', 'community')
    )
  );

create policy "community_comments: owner admin read"
  on public.community_comments for select
  using (auth.uid() = user_id or public.is_admin());

create policy "community_comments: authenticated insert visible post"
  on public.community_comments for insert
  with check (
    auth.uid() = user_id
    and status = 'published'
    and exists (
      select 1 from public.community_posts post
      where post.id = community_comments.post_id
        and post.status = 'published'
        and post.visibility in ('public', 'community')
    )
  );

create policy "community_comments: owner update own"
  on public.community_comments for update
  using (auth.uid() = user_id and status <> 'deleted')
  with check (auth.uid() = user_id and status in ('published', 'deleted'));

create policy "community_comments: admin update any"
  on public.community_comments for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "community_comments: owner delete own"
  on public.community_comments for delete
  using (auth.uid() = user_id);

create policy "community_comments: admin delete any"
  on public.community_comments for delete
  using (public.is_admin());

-- Attachments ------------------------------------------------------------
drop policy if exists "community_attachments: read visible post attachments" on public.community_post_attachments;
drop policy if exists "community_attachments: owner admin read" on public.community_post_attachments;
drop policy if exists "community_attachments: owner insert" on public.community_post_attachments;
drop policy if exists "community_attachments: owner update" on public.community_post_attachments;
drop policy if exists "community_attachments: owner delete" on public.community_post_attachments;
drop policy if exists "community_attachments: admin manage" on public.community_post_attachments;

create policy "community_attachments: read visible post attachments"
  on public.community_post_attachments for select
  using (
    exists (
      select 1 from public.community_posts post
      where post.id = community_post_attachments.post_id
        and post.status = 'published'
        and post.visibility in ('public', 'community')
    )
  );

create policy "community_attachments: owner admin read"
  on public.community_post_attachments for select
  using (auth.uid() = user_id or public.is_admin());

create policy "community_attachments: owner insert"
  on public.community_post_attachments for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.community_posts post
      where post.id = community_post_attachments.post_id
        and post.user_id = auth.uid()
    )
  );

create policy "community_attachments: owner update"
  on public.community_post_attachments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "community_attachments: owner delete"
  on public.community_post_attachments for delete
  using (auth.uid() = user_id);

create policy "community_attachments: admin manage"
  on public.community_post_attachments for all
  using (public.is_admin())
  with check (public.is_admin());

-- Tags -------------------------------------------------------------------
drop policy if exists "community_tags: read all" on public.community_tags;
drop policy if exists "community_tags: authenticated insert" on public.community_tags;
drop policy if exists "community_tags: admin update" on public.community_tags;
drop policy if exists "community_tags: admin delete" on public.community_tags;

create policy "community_tags: read all"
  on public.community_tags for select
  using (true);

create policy "community_tags: authenticated insert"
  on public.community_tags for insert
  with check (auth.uid() is not null);

create policy "community_tags: admin update"
  on public.community_tags for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "community_tags: admin delete"
  on public.community_tags for delete
  using (public.is_admin());

-- Post tags --------------------------------------------------------------
drop policy if exists "community_post_tags: read visible post tags" on public.community_post_tags;
drop policy if exists "community_post_tags: owner insert" on public.community_post_tags;
drop policy if exists "community_post_tags: owner delete" on public.community_post_tags;
drop policy if exists "community_post_tags: admin manage" on public.community_post_tags;

create policy "community_post_tags: read visible post tags"
  on public.community_post_tags for select
  using (
    exists (
      select 1 from public.community_posts post
      where post.id = community_post_tags.post_id
        and (post.status = 'published' and post.visibility in ('public', 'community')
          or post.user_id = auth.uid()
          or public.is_admin())
    )
  );

create policy "community_post_tags: owner insert"
  on public.community_post_tags for insert
  with check (
    exists (
      select 1 from public.community_posts post
      where post.id = community_post_tags.post_id
        and post.user_id = auth.uid()
    )
  );

create policy "community_post_tags: owner delete"
  on public.community_post_tags for delete
  using (
    exists (
      select 1 from public.community_posts post
      where post.id = community_post_tags.post_id
        and post.user_id = auth.uid()
    )
  );

create policy "community_post_tags: admin manage"
  on public.community_post_tags for all
  using (public.is_admin())
  with check (public.is_admin());

-- Reports ----------------------------------------------------------------
drop policy if exists "community_reports: owner admin read" on public.community_reports;
drop policy if exists "community_reports: authenticated insert" on public.community_reports;
drop policy if exists "community_reports: admin update" on public.community_reports;
drop policy if exists "community_reports: admin delete" on public.community_reports;

create policy "community_reports: owner admin read"
  on public.community_reports for select
  using (auth.uid() = reporter_id or public.is_admin());

create policy "community_reports: authenticated insert"
  on public.community_reports for insert
  with check (auth.uid() = reporter_id);

create policy "community_reports: admin update"
  on public.community_reports for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "community_reports: admin delete"
  on public.community_reports for delete
  using (public.is_admin());

-- Supabase Data API grants. RLS remains the row-level guard.
grant select on public.community_posts to anon, authenticated;
grant insert, update, delete on public.community_posts to authenticated;
grant select on public.community_comments to anon, authenticated;
grant insert, update, delete on public.community_comments to authenticated;
grant select on public.community_post_attachments to anon, authenticated;
grant insert, update, delete on public.community_post_attachments to authenticated;
grant select on public.community_tags to anon, authenticated;
grant insert on public.community_tags to authenticated;
grant update, delete on public.community_tags to authenticated;
grant select on public.community_post_tags to anon, authenticated;
grant insert, delete on public.community_post_tags to authenticated;
grant select, insert on public.community_reports to authenticated;
grant update, delete on public.community_reports to authenticated;

notify pgrst, 'reload schema';
