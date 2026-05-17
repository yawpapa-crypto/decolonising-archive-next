-- Workbench notes innovation layer (safe idempotent adds)

alter table public.workbench_notes
  add column if not exists pinned boolean not null default false;

alter table public.workbench_notes
  add column if not exists status text not null default 'draft';

create index if not exists workbench_notes_pinned_idx
  on public.workbench_notes (pinned desc, updated_at desc);

create table if not exists public.workbench_note_records (
  id         uuid primary key default gen_random_uuid(),
  note_id    uuid not null references public.workbench_notes(id) on delete cascade,
  record_id  text not null,
  created_at timestamptz not null default now(),
  unique (note_id, record_id)
);

create index if not exists workbench_note_records_note_idx
  on public.workbench_note_records (note_id);

alter table public.workbench_note_records enable row level security;

drop policy if exists "workbench_note_records: select via note" on public.workbench_note_records;
drop policy if exists "workbench_note_records: insert via note edit" on public.workbench_note_records;
drop policy if exists "workbench_note_records: delete via note edit" on public.workbench_note_records;

create policy "workbench_note_records: select via note"
  on public.workbench_note_records for select
  using (
    exists (
      select 1 from public.workbench_notes n
      where n.id = note_id
        and n.deleted_at is null
        and (
          n.user_id = auth.uid()
          or (
            n.project_id is not null
            and public.workbench_can_read_project(n.project_id)
          )
        )
    )
  );

create policy "workbench_note_records: insert via note edit"
  on public.workbench_note_records for insert
  with check (
    exists (
      select 1 from public.workbench_notes n
      where n.id = note_id
        and n.deleted_at is null
        and (
          n.user_id = auth.uid()
          or (
            n.project_id is not null
            and public.workbench_can_manage_project(n.project_id)
          )
        )
    )
  );

create policy "workbench_note_records: delete via note edit"
  on public.workbench_note_records for delete
  using (
    exists (
      select 1 from public.workbench_notes n
      where n.id = note_id
        and (
          n.user_id = auth.uid()
          or (
            n.project_id is not null
            and public.workbench_can_manage_project(n.project_id)
          )
        )
    )
  );
