-- Extend workbench_notes for document editor + soft delete

alter table public.workbench_notes
  alter column project_id drop not null;

alter table public.workbench_notes
  drop constraint if exists workbench_notes_project_id_fkey;

alter table public.workbench_notes
  add constraint workbench_notes_project_id_fkey
  foreign key (project_id) references public.workbench_projects(id) on delete set null;

alter table public.workbench_notes
  add column if not exists plain_text text,
  add column if not exists word_count integer not null default 0,
  add column if not exists character_count integer not null default 0,
  add column if not exists deleted_at timestamptz;

create index if not exists workbench_notes_deleted_idx
  on public.workbench_notes (deleted_at);

-- RLS: readable notes (not deleted)
drop policy if exists "workbench_notes: select member" on public.workbench_notes;
create policy "workbench_notes: select member"
  on public.workbench_notes for select
  using (
    deleted_at is null
    and (
      user_id = auth.uid()
      or (
        project_id is not null
        and public.workbench_can_read_project(project_id)
      )
    )
  );

drop policy if exists "workbench_notes: insert member" on public.workbench_notes;
create policy "workbench_notes: insert member"
  on public.workbench_notes for insert
  with check (
    auth.uid() = user_id
    and (
      project_id is null
      or public.workbench_can_read_project(project_id)
    )
  );

-- Storage: workbench-note-images (public read for embedded images)
insert into storage.buckets (id, name, public, file_size_limit)
values ('workbench-note-images', 'workbench-note-images', true, 5242880)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

drop policy if exists "workbench-note-images: public read" on storage.objects;
drop policy if exists "workbench-note-images: insert own" on storage.objects;
drop policy if exists "workbench-note-images: update own" on storage.objects;
drop policy if exists "workbench-note-images: delete own" on storage.objects;

create policy "workbench-note-images: public read"
  on storage.objects for select
  using (bucket_id = 'workbench-note-images');

create policy "workbench-note-images: insert own"
  on storage.objects for insert
  with check (
    bucket_id = 'workbench-note-images'
    and auth.role() = 'authenticated'
    and split_part(name, '/', 2) = auth.uid()::text
  );

create policy "workbench-note-images: update own"
  on storage.objects for update
  using (
    bucket_id = 'workbench-note-images'
    and auth.role() = 'authenticated'
    and split_part(name, '/', 2) = auth.uid()::text
  )
  with check (
    bucket_id = 'workbench-note-images'
    and split_part(name, '/', 2) = auth.uid()::text
  );

create policy "workbench-note-images: delete own"
  on storage.objects for delete
  using (
    bucket_id = 'workbench-note-images'
    and auth.role() = 'authenticated'
    and split_part(name, '/', 2) = auth.uid()::text
  );
