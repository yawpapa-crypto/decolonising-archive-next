begin;
create table public.collection_editions (
 collection_id uuid primary key references public.reading_lists(id) on delete cascade,
 document jsonb not null default '{}', revision integer not null default 1,
 derived_from uuid references public.reading_lists(id) on delete set null,
 updated_at timestamptz not null default now(),
 check(jsonb_typeof(document)='object'), check(octet_length(document::text)<=200000)
);
alter table public.collection_editions enable row level security;
create policy edition_read on public.collection_editions for select using(exists(select 1 from public.reading_lists l where l.id=collection_id and (l.user_id=auth.uid() or (l.is_public and coalesce(l.description,'') not like '[field-tombstone:%'))));
create policy edition_insert on public.collection_editions for insert to authenticated with check(exists(select 1 from public.reading_lists l where l.id=collection_id and l.user_id=auth.uid()));
create policy edition_update on public.collection_editions for update to authenticated using(exists(select 1 from public.reading_lists l where l.id=collection_id and l.user_id=auth.uid())) with check(exists(select 1 from public.reading_lists l where l.id=collection_id and l.user_id=auth.uid()));
grant select on public.collection_editions to anon;
grant select,insert,update on public.collection_editions to authenticated;

create table public.knowledge_proposals (
 id uuid primary key default gen_random_uuid(), proposer_id uuid not null references public.profiles(id) on delete cascade,
 kind text not null check(kind in ('record','source','correction','relationship','attribution')),
 title text not null check(length(title) between 1 and 160), detail text not null check(length(detail) between 1 and 10000),
 evidence_url text not null check(evidence_url ~ '^https?://'), record_id text, related_record_id text,
 relationship text check(relationship is null or relationship in ('influenced_by','responds_to','documents','attributed_to','related_to')),
 status text not null default 'pending' check(status in ('pending','in_review','accepted','declined','needs_evidence')),
 reviewer_note text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(kind<>'relationship' or (record_id is not null and related_record_id is not null and relationship is not null and record_id<>related_record_id))
);
create index knowledge_proposals_queue on public.knowledge_proposals(status,created_at);
create table public.knowledge_proposal_revisions (
 id bigint generated always as identity primary key, proposal_id uuid not null references public.knowledge_proposals(id) on delete cascade,
 actor_id uuid references public.profiles(id) on delete set null, snapshot jsonb not null, created_at timestamptz not null default now()
);
alter table public.knowledge_proposals enable row level security;
alter table public.knowledge_proposal_revisions enable row level security;
create policy proposal_read on public.knowledge_proposals for select to authenticated using(proposer_id=auth.uid() or exists(select 1 from public.profiles where id=auth.uid() and role='admin'));
create policy proposal_insert on public.knowledge_proposals for insert to authenticated with check(proposer_id=auth.uid() and status='pending' and reviewer_note='');
create policy proposal_review on public.knowledge_proposals for update to authenticated using(exists(select 1 from public.profiles where id=auth.uid() and role='admin')) with check(exists(select 1 from public.profiles where id=auth.uid() and role='admin'));
create policy revision_read on public.knowledge_proposal_revisions for select to authenticated using(exists(select 1 from public.knowledge_proposals p where p.id=proposal_id and (p.proposer_id=auth.uid() or exists(select 1 from public.profiles where id=auth.uid() and role='admin'))));
grant select,insert,update on public.knowledge_proposals to authenticated;
grant select on public.knowledge_proposal_revisions to authenticated;
create function public.knowledge_revision() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$ begin
 new.updated_at=now();
 return new;
end $$;
create trigger proposal_clock before update on public.knowledge_proposals for each row execute function public.knowledge_revision();
create function public.knowledge_revision_log() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$ begin
 insert into public.knowledge_proposal_revisions(proposal_id,actor_id,snapshot) values(new.id,auth.uid(),to_jsonb(new)); return new;
end $$;
create trigger proposal_revision after insert or update on public.knowledge_proposals for each row execute function public.knowledge_revision_log();
create function public.graph_public_relationships() returns table(record_id text,related_record_id text,relationship text,evidence_url text) language sql stable security definer set search_path=public,pg_temp as $$
 select record_id,related_record_id,relationship,evidence_url from public.knowledge_proposals where kind='relationship' and status='accepted'
$$;
revoke all on function public.graph_public_relationships() from public;
grant execute on function public.graph_public_relationships() to anon,authenticated;

-- Atomic branch of a public teaching collection or one's own private collection.
-- API supplies only publicly verified record IDs; SQL intersects with actual membership.
create function public.branch_collection(source_id uuid,allowed_ids text[]) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare original public.reading_lists; target uuid;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select * into original from public.reading_lists where id=source_id and (is_public or user_id=auth.uid()) and coalesce(description,'') not like '[field-tombstone:%' for share;
 if original.id is null then raise exception 'Collection unavailable'; end if;
 insert into public.reading_lists(user_id,title,description,is_public) values(auth.uid(),left(original.title||' — my copy',120),original.description,false) returning id into target;
 insert into public.reading_list_items(reading_list_id,record_id,position) select target,record_id,position from public.reading_list_items where reading_list_id=source_id and record_id=any(allowed_ids);
 insert into public.collection_editions(collection_id,document,derived_from) select target,document,source_id from public.collection_editions where collection_id=source_id;
 return target;
end $$;
revoke all on function public.branch_collection(uuid,text[]) from public;
grant execute on function public.branch_collection(uuid,text[]) to authenticated;
commit;
