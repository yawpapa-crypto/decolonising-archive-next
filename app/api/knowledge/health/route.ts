import { requireAdminApi,isGuardResponse } from "@/src/lib/security/auth-guards";
import { checkOrigin } from "@/lib/knowledge/request";
import { createClient } from "@/src/lib/supabase/server";
import { loadCatalogueRecords } from "@/lib/catalogue/store";
import { resolveServerRecordImage } from "@/lib/catalogue/record-image-server";
import { checkPublicUrl } from "@/lib/knowledge/url-health";
export async function POST(request:Request){
 const denied=checkOrigin(request);if(denied)return denied;const actor=await requireAdminApi();if(isGuardResponse(actor))return actor;
 const body=await request.json().catch(()=>({}));const offset=Math.max(0,Math.floor(Number(body.offset)||0));
 const urls=[...new Set(loadCatalogueRecords().flatMap(r=>[r.sourceUrl,resolveServerRecordImage(r).url]).filter((u):u is string=>Boolean(u?.startsWith('https://')||u?.startsWith('http://'))))];
 const batch=urls.slice(offset,offset+20);const db=await createClient();
 for(let i=0;i<batch.length;i+=5){const rows=await Promise.all(batch.slice(i,i+5).map(async url=>({url,...await checkPublicUrl(url),checked_at:new Date().toISOString()})));const {error}=await db.from('archive_url_health').upsert(rows);if(error)return Response.json({error:'URL results could not save.'},{status:503});}
 return Response.json({checked:batch.length,next:offset+20<urls.length?offset+20:null,total:urls.length});
}
