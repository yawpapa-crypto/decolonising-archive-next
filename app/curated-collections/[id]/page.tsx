import BranchCollection from "@/components/knowledge/BranchCollection";
import { blankEdition,cleanEdition } from "@/lib/knowledge/edition";
import JsonLd from "@/src/components/kgo/JsonLd";
import { absoluteUrl } from "@/lib/kgo/site";
import Link from "next/link";
import { notFound } from "next/navigation";
import Shell from "@/app/following/Shell";
import FollowButton from "@/app/following/FollowButton";
import PublicArchive from "@/app/following/PublicArchive";
import { createClient } from "@/src/lib/supabase/server";
import { publicRecords, type Actor } from "@/lib/following/server";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[\da-f-]{36}$/i.test(id)) notFound();
  const db = await createClient();
  const { data: list } = await db
    .from("reading_lists")
    .select("id,user_id,title,description,created_at,updated_at")
    .eq("id", id)
    .eq("is_public", true)
    .maybeSingle();
  if (!list || list.description?.startsWith("[field-tombstone:")) notFound();
  const [
    { data: actors },
    { data: records },
    {
      data: { user },
    },
  ] = await Promise.all([
    db.rpc("curatorial_actors", { ids: [list.user_id] }),
    db.rpc("curatorial_public_records", { collection_ids: [id] }),
    db.auth.getUser(),
  ]);
  const {data:edition}=await db.from("collection_editions").select("document,updated_at,derived_from").eq("collection_id",id).maybeSingle();
  const items=publicRecords((records??[]).map((r:{record_id:string})=>r.record_id));
  const document=cleanEdition(edition?.document??blankEdition(),items.map(i=>i.id));
  const actor = (actors as Actor[] | null)?.[0];
  const { data: follows } = user
    ? await db
        .from("curatorial_follows")
        .select("collection_id")
        .eq("user_id", user.id)
        .eq("collection_id", id)
    : { data: [] };
  return (
    <Shell>
      <JsonLd data={{"@context":"https://schema.org","@type":"CollectionPage",name:list.title,url:absoluteUrl(`/curated-collections/${id}`),description:document.introduction||list.description,dateModified:edition?.updated_at||list.updated_at,hasPart:items.map(i=>({"@type":"CreativeWork",name:i.title,url:absoluteUrl(`/records/${encodeURIComponent(i.id)}`)}))}} />
      <main className="cf-profile">
        <header>
          <p className="cf-kicker">Public collection</p>
          <h1>{list.title}</h1>
          {list.description && <p>{list.description}</p>}
          {actor && (
            <Link href={`/people/${actor.id}`}>Curated by {actor.name}</Link>
          )}
          <p className="cf-note">
            Created {new Date(list.created_at).toLocaleDateString("en-AU")} ·
            Updated {new Date(list.updated_at).toLocaleDateString("en-AU")}
          </p>
          <FollowButton
            id={id}
            kind="collection"
            signedIn={Boolean(user)}
            initial={Boolean(follows?.length)}
          />
        </header>
        <BranchCollection id={id} signedIn={Boolean(user)} />
        {document.introduction&&<section><h2>Introduction</h2><p style={{whiteSpace:"pre-wrap"}}>{document.introduction}</p></section>}
        {document.rationale&&<section><h2>Curatorial rationale</h2><p style={{whiteSpace:"pre-wrap"}}>{document.rationale}</p></section>}
        {document.prompts&&<section><h2>Questions to take with you</h2><p style={{whiteSpace:"pre-wrap"}}>{document.prompts}</p></section>}
        {document.sections.map((section,index)=><section key={index}><h2>{section.title}</h2><PublicArchive items={items.filter(i=>section.recordIds.includes(i.id))}/></section>)}
        <PublicArchive items={items.filter(i=>!document.sections.some(s=>s.recordIds.includes(i.id)))} />
        {document.relationships.map((r,index)=><aside key={`relation-${index}`}><h3>Curatorial connection</h3><p><Link href={`/records/${encodeURIComponent(r.from)}`}>{items.find(i=>i.id===r.from)?.title}</Link> ↔ <Link href={`/records/${encodeURIComponent(r.to)}`}>{items.find(i=>i.id===r.to)?.title}</Link></p><p style={{whiteSpace:"pre-wrap"}}>{r.note}</p></aside>)}
        <p><a href={`/api/knowledge/collections/${id}?export=bibtex`}>Export research list · BibTeX</a> · <a href={`/api/knowledge/collections/${id}?export=ris`}>RIS</a></p>
        {Object.entries(document.annotations).filter(([,note])=>note).map(([recordId,note])=><aside key={recordId}><h3><Link href={`/records/${encodeURIComponent(recordId)}`}>{items.find(i=>i.id===recordId)?.title}</Link></h3><p style={{whiteSpace:"pre-wrap"}}>{note}</p></aside>)}
        <p className="cf-note">
          Only records whose current public access can be verified are
          displayed. Private notes stay in the curator’s Library.
        </p>
      </main>
    </Shell>
  );
}
