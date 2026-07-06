-- Editorial workflow fields for curator workspace (extends 0002_workspace_and_curator_tools.sql)

-- curator_dossiers: long-form body + archived status
alter table public.curator_dossiers
  add column if not exists body text;

alter table public.curator_dossiers drop constraint if exists curator_dossiers_status_check;
alter table public.curator_dossiers add constraint curator_dossiers_status_check
  check (status in ('draft', 'review', 'published', 'archived'));

-- archive_notes: note taxonomy + archived status
alter table public.archive_notes
  add column if not exists note_type text;

update public.archive_notes
  set note_type = 'context'
  where note_type is null;

alter table public.archive_notes
  alter column note_type set default 'context';

alter table public.archive_notes
  alter column note_type set not null;

alter table public.archive_notes drop constraint if exists archive_notes_note_type_check;
alter table public.archive_notes add constraint archive_notes_note_type_check
  check (note_type in ('context', 'provenance', 'rights', 'warning', 'citation', 'correction'));

alter table public.archive_notes drop constraint if exists archive_notes_status_check;
alter table public.archive_notes add constraint archive_notes_status_check
  check (status in ('draft', 'review', 'published', 'archived'));

-- featured_records: tri-state editorial status + updated_at
alter table public.featured_records
  add column if not exists editorial_status text;

update public.featured_records
  set editorial_status = case when coalesce(is_active, true) then 'active' else 'inactive' end
  where editorial_status is null;

alter table public.featured_records
  alter column editorial_status set default 'active';

alter table public.featured_records
  alter column editorial_status set not null;

alter table public.featured_records drop constraint if exists featured_records_editorial_status_check;
alter table public.featured_records add constraint featured_records_editorial_status_check
  check (editorial_status in ('active', 'inactive', 'archived'));

alter table public.featured_records
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists featured_records_set_updated_at on public.featured_records;
create trigger featured_records_set_updated_at
  before update on public.featured_records
  for each row execute function public.touch_profiles_updated_at();

-- themed_pathways: archived status
alter table public.themed_pathways drop constraint if exists themed_pathways_status_check;
alter table public.themed_pathways add constraint themed_pathways_status_check
  check (status in ('draft', 'review', 'published', 'archived'));
