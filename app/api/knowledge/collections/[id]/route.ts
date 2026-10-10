import { createClient } from "@/src/lib/supabase/server";
import { cleanEdition } from "@/lib/knowledge/edition";
import { checkOrigin } from "@/lib/knowledge/request";
import { getPublicArchiveRecords } from "@/lib/kgo/records";
import { toBibTeX,toRIS } from "@/lib/kgo/citations";
type Context = {params:Promise<{id:string}>};
export async function GET(request:Request,{params}:Context) {
  const {id}=await params; const db=await createClient();
  const format=new URL(request.url).searchParams.get("export");
  if(format){
    if(!["bibtex","ris"].includes(format))return Response.json({error:"Unsupported export format."},{status:400});
    const {data:list}=await db.from("reading_lists").select("id,user_id,is_public,description").eq("id",id).maybeSingle();
    const {data:{user}}=await db.auth.getUser();
    if(!list || (!list.is_public&&list.user_id!==user?.id) || list.description?.startsWith("[field-tombstone:"))return Response.json({error:"Collection unavailable."},{status:404});
    const {data:members,error}=list.user_id===user?.id ? await db.from("reading_list_items").select("record_id").eq("reading_list_id",id) : await db.rpc("curatorial_public_records",{collection_ids:[id]});
    if(error)return Response.json({error:"Collection records could not load."},{status:503});
    const ids=new Set((members??[]).map((m:{record_id:string})=>m.record_id));const records=(await getPublicArchiveRecords()).filter(r=>ids.has(r.id));
    return new Response(records.map(format==='ris'?toRIS:toBibTeX).join('\n'),{headers:{"Content-Type":format==='ris'?"application/x-research-info-systems; charset=utf-8":"application/x-bibtex; charset=utf-8","Content-Disposition":`attachment; filename="ared-collection.${format==='ris'?'ris':'bib'}"`,"Cache-Control":"private, no-store","X-ARED-Export-Records":String(records.length)}});
  }
  const {data,error}=await db.from("collection_editions").select("document,revision,derived_from,updated_at").eq("collection_id",id).maybeSingle();
  if(error)return Response.json({error:"Could not load collection writing."},{status:503});
  return Response.json({edition:data},{headers:{"Cache-Control":"private, no-store"}});
}
export async function PUT(request:Request,{params}:Context) {
  const denied=checkOrigin(request);if(denied)return denied;
  const {id}=await params; const db=await createClient();const {data:{user}}=await db.auth.getUser();
  if(!user)return Response.json({error:"Sign in first."},{status:401});
  const {data:list}=await db.from("reading_lists").select("id,description").eq("id",id).eq("user_id",user.id).maybeSingle();
  if(!list || list.description?.startsWith("[field-tombstone:"))return Response.json({error:"Collection unavailable."},{status:404});
  const body=await request.json().catch(()=>null);
  if(!body || JSON.stringify(body).length>200000 || !Number.isInteger(body.revision) || body.revision<0)return Response.json({error:"Invalid collection writing."},{status:400});
  const {data:members,error:readError}=await db.from("reading_list_items").select("record_id").eq("reading_list_id",id);
  if(readError)return Response.json({error:"Could not verify collection records."},{status:503});
  const document=cleanEdition(body.document,(members??[]).map(m=>m.record_id));
  const row={document,revision:body.revision+1,updated_at:new Date().toISOString()};
  const result=body.revision===0 ? await db.from("collection_editions").insert({collection_id:id,...row}).select("revision").single() : await db.from("collection_editions").update(row).eq("collection_id",id).eq("revision",body.revision).select("revision").maybeSingle();
  if(result.error || !result.data)return Response.json({error:"Writing changed in another session, or could not save. Reload before trying again."},{status:409});
  return Response.json({revision:result.data.revision,document});
}
export async function POST(request:Request,{params}:Context) {
  const denied=checkOrigin(request);if(denied)return denied;
  const {id}=await params; const db=await createClient();const {data:{user}}=await db.auth.getUser();
  if(!user)return Response.json({error:"Sign in to copy a collection."},{status:401});
  const {data,error}=await db.rpc("branch_collection",{source_id:id,allowed_ids:(await getPublicArchiveRecords()).map(r=>r.id)});
  return error ? Response.json({error:"Could not copy this collection."},{status:503}) : Response.json({id:data},{status:201});
}
