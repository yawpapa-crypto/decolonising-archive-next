import { createClient } from "@/src/lib/supabase/server";
import { getPublicArchiveRecord } from "@/lib/kgo/records";
import { checkOrigin, publicEvidence } from "@/lib/knowledge/request";
export async function POST(request: Request) {
  const denied = checkOrigin(request); if (denied) return denied;
  const db = await createClient(); const {data:{user}} = await db.auth.getUser();
  if (!user) return Response.json({error:"Sign in to propose a contribution."},{status:401});
  const {count,error:quotaError}=await db.from("knowledge_proposals").select("id",{count:"exact",head:true}).eq("proposer_id",user.id).gte("created_at",new Date(Date.now()-3600000).toISOString());
  if(quotaError)return Response.json({error:"Contributions are temporarily unavailable."},{status:503});
  if((count??0)>=20)return Response.json({error:"Please wait before submitting more proposals."},{status:429});
  if (Number(request.headers.get("content-length")) > 20000) return Response.json({error:"Contribution is too long."},{status:413});
  const body = await request.json().catch(()=>null);
  const kinds = ["record","source","correction","relationship","attribution"];
  const evidence = publicEvidence(body?.evidence_url);
  if (!body || !kinds.includes(body.kind) || !evidence || typeof body.title !== "string" || !body.title.trim() || typeof body.detail !== "string" || !body.detail.trim() || body.detail.length>10000) return Response.json({error:"Add a title, explanation and a valid evidence URL."},{status:400});
  const recordId = typeof body.record_id === "string" ? body.record_id.slice(0,200) : null;
  const relatedId = typeof body.related_record_id === "string" ? body.related_record_id.slice(0,200) : null;
  for (const id of [recordId,relatedId].filter(Boolean)) if (!await getPublicArchiveRecord(id!)) return Response.json({error:"Choose an existing public record."},{status:400});
  if (body.kind==="relationship" && (!recordId || !relatedId || recordId===relatedId || !["influenced_by","responds_to","documents","attributed_to","related_to"].includes(body.relationship))) return Response.json({error:"Choose two records and a relationship."},{status:400});
  const {data,error}=await db.from("knowledge_proposals").insert({proposer_id:user.id,kind:body.kind,title:body.title.trim().slice(0,160),detail:body.detail.trim(),evidence_url:evidence,record_id:recordId,related_record_id:relatedId,relationship:body.kind==="relationship"?body.relationship:null}).select("id,status").single();
  return error ? Response.json({error:"Could not submit your contribution. Please try again."},{status:503}) : Response.json({proposal:data},{status:201});
}
