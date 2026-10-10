import "server-only";
import { cache } from "react";
import { getPublicArchiveRecords } from "@/lib/kgo/records";
import { createClient } from "@/src/lib/supabase/server";
import { graphFromRecords, type KnowledgeEdge } from "./model";

export const publicKnowledgeGraph = cache(async () => {
  const records = await getPublicArchiveRecords();
  const db = await createClient();
  const { data: lists } = await db.from("reading_lists").select("id,title,user_id,description").eq("is_public", true).limit(1000);
  const visible = (lists ?? []).filter(l => !l.description?.startsWith("[field-tombstone:"));
  const ids = visible.map(l => l.id);
  const [{ data: members }, { data: actors }, { data: proposals }] = await Promise.all([
    ids.length ? db.rpc("curatorial_public_records", { collection_ids: ids }) : Promise.resolve({ data: [] }),
    ids.length ? db.rpc("curatorial_actors", { ids: [...new Set(visible.map(l => l.user_id))] }) : Promise.resolve({ data: [] }),
    db.rpc("graph_public_relationships"),
  ]);
  const assertions: KnowledgeEdge[] = (proposals ?? []).map((p:{record_id:string;related_record_id:string;relationship:string;evidence_url:string}) => ({ from: `record:${p.record_id}`, to: `record:${p.related_record_id}`, relation: p.relationship, basis: "curatorial", evidence: p.evidence_url }));
  return graphFromRecords(records, visible.map(l => ({ id:l.id,title:l.title,userId:l.user_id,curator:actors?.find((a:{id:string})=>a.id===l.user_id)?.name,recordIds:(members ?? []).filter((m:{reading_list_id:string})=>m.reading_list_id===l.id).map((m:{record_id:string})=>m.record_id) })), assertions);
});
