import { NextResponse } from "next/server";
import { createClient as bearerClient } from "@supabase/supabase-js";
import { createClient } from "@/src/lib/supabase/server";
import { discoveryAuthContext } from "@/src/lib/supabase/request-context";
import { onboardingConfig } from "@/lib/onboarding/config";
import { interestGroups } from "@/lib/onboarding/taxonomy";
import * as onboarding from "../../onboarding/route";
import * as onboardingUsername from "../../onboarding/username/route";
import { getExplorePage } from "@/lib/home/for-you";
import { featuredDate, featuredOrder } from "@/lib/home/featured";
import { loadCatalogueRecords } from "@/lib/catalogue/store";
import * as feed from "../../for-you/route";
import { isTombstoneReadingList } from "@/src/lib/member-workspace";
import { publicRecords } from "@/lib/following/server";
import * as following from "../../following/route";
import * as related from "../../for-you/similar/route";
import * as events from "../../recommendations/events/route";
import * as saves from "../../for-you/save/route";
import * as collections from "../../for-you/collections/route";
import { filterCatalogueRecords, getCatalogueRecord, loadCatalogueTaxonomy } from "@/lib/catalogue/store";
import { allowed, hydrate } from "@/lib/recommendations/catalogue";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ action: string }> };
const handlers: Record<string, Record<string, (request: Request) => Promise<Response>>> = {
  onboarding: {GET: onboarding.GET, POST: onboarding.POST}, "onboarding-username":{GET:onboardingUsername.GET},
  "for-you": { POST: feed.POST }, following: { GET: following.GET, POST: following.POST },
  related: { POST: related.POST }, events: { POST: events.POST, DELETE: events.DELETE },
  save: { POST: saves.POST }, collections: { GET: collections.GET, POST: collections.POST },
};
async function dispatch(request: Request, context: Context) {
  const { action } = await context.params;
  const account = action === "profile" && ["GET", "PATCH"].includes(request.method);
  const local = ["search", "explore", "record", "taxonomy", "public-collections", "onboarding-config"].includes(action);
  const handler = handlers[action]?.[request.method];
  if (!handler && !account && !(local && request.method === "GET")) return NextResponse.json({ error: "Unsupported discovery action" }, { status: 405 });
  const publicAction = local || action === "for-you" || action === "related";
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  const origin = request.headers.get("origin");
  if (!publicAction && !token && request.method !== "GET" && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Discovery authentication unavailable" }, { status: 503 });
  const client = token ? bearerClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } }) : await createClient();
  const { data, error } = await client.auth.getUser(token);
  if ((!publicAction || token) && (error || !data.user)) return NextResponse.json({ error: "Sign in with your ARED account" }, { status: 401 });
  return discoveryAuthContext.run(client, async () => {
    let response: Response;
    if (handler) {
      let canonicalRequest = request;
      if (action === "for-you" && !data.user) {
        const body = await request.json().catch(() => ({}));
        canonicalRequest = new Request(request.url, { method: "POST", headers: request.headers, body: JSON.stringify({ ...body, personalise: false, ignoreEvents: true, session: [], intent: [], sessionId: undefined }) });
      }
      if (action === "save" || action === "related") {
        const body = await request.json().catch(() => null) as Record<string, unknown> | null;
        const itemBody = action === "related" ? body?.item as Record<string, unknown> | undefined : body;
        const id = typeof itemBody?.id === "string" ? itemBody.id.slice(0, 160) : "";
        const record = getCatalogueRecord(id);
        if (!body || !id || (record && !allowed(record))) return NextResponse.json({ error: "Record unavailable" }, { status: 404 });
        if (!record && !/^(wc-|ol-|oa-|gb-|cr-|ss-|met-|loc-|ARED-|europeana)/.test(id)) return NextResponse.json({ error: "Unknown canonical record" }, { status: 404 });
        const item = record ? hydrate(record) : null;
        canonicalRequest = new Request(request.url, { method: "POST", headers: request.headers, body: JSON.stringify(item ? action === "related" ? { ...body, item } : { ...item, type: item.kind, listId: body.listId, unsave: body.unsave, quick: body.quick, undoToken: body.undoToken } : body) });
      }
      response = await handler(canonicalRequest);
    }
    else {
      const q = new URL(request.url).searchParams;
      if (account) {
        if (request.method === "PATCH") {
          const body = await request.json().catch(() => null) as Record<string, unknown> | null;
          if (!body) return NextResponse.json({error:"Invalid profile"},{status:400});
          const clean = (key: string, limit: number) => typeof body[key] === "string" ? (body[key] as string).trim().slice(0,limit) : "";
          const username = clean("username",24).toLowerCase();
          if (username && !/^[a-z0-9_]{3,24}$/.test(username)) return NextResponse.json({error:"Username must be 3–24 lowercase letters, numbers or underscores."},{status:400});
          const website = clean("website",500);
          if (website) { try { const parsed = new URL(website); if (!["https:","http:"].includes(parsed.protocol)) throw new Error(); } catch { return NextResponse.json({error:"Enter a complete http or https website URL."},{status:400}); } }
          const patch: Record<string, unknown> = {username:username || null,full_name:clean("full_name",120),display_name:clean("full_name",120),short_bio:clean("short_bio",240),website:website || null};
          if (body.social_links !== undefined) {
            const links = body.social_links as Record<string,unknown>;
            if (!links || typeof links !== "object") return NextResponse.json({error:"Invalid social links"},{status:400});
            const instagram = String(links.instagram || "").replace(/^@/, "").trim();
            const x = String(links.x || "").replace(/^@/, "").trim();
            if ((instagram && !/^[a-zA-Z0-9_.]{1,30}$/.test(instagram)) || (x && !/^[a-zA-Z0-9_]{1,15}$/.test(x))) return NextResponse.json({error:"Enter valid Instagram and X usernames."},{status:400});
            patch.social_links = {instagram,x};
          }
          const {error:writeError} = await client.from("profiles").update(patch).eq("id",data.user!.id).select("id").single();
          if (writeError) return NextResponse.json({error:writeError.code === "23505" ? "That username is already in use." : "Profile could not be saved. Check the shared profile service and social-links migration."},{status:409});
        }
        const {data:row,error:readError} = await client.from("profiles").select("*").eq("id",data.user!.id).single();
        if (readError || !row) return NextResponse.json({error:"Shared account profile unavailable"},{status:503});
        response = NextResponse.json({profile:{username:row.username || "",name:row.full_name || row.display_name || "",bio:row.short_bio || "",website:row.website || "",instagram:row.social_links?.instagram || "",x:row.social_links?.x || "",socialLinksAvailable:Object.prototype.hasOwnProperty.call(row,"social_links")}});
      }
      else if (action === "public-collections") {
        const {data:lists,error:listError} = await client.from("reading_lists").select("id,title,description,user_id").eq("is_public",true).order("updated_at",{ascending:false}).limit(12);
        if (listError) return NextResponse.json({error:"Public collections unavailable"},{status:503});
        const {data:members,error:memberError} = await client.rpc("curatorial_public_records",{collection_ids:(lists || []).map(list => list.id)});
        if (memberError) return NextResponse.json({error:"Public collection records unavailable"},{status:503});
        response = NextResponse.json({collections:(lists || []).filter(list => !isTombstoneReadingList(list)).map(list => {
          const ids = (members || []).filter((member: {reading_list_id:string}) => member.reading_list_id === list.id).map((member: {record_id:string}) => member.record_id);
          const records = ids.map((id:string) => getCatalogueRecord(id)).filter((record: ReturnType<typeof getCatalogueRecord>) => record && allowed(record));
          return {id:list.id,title:list.title,count:records.length,items:publicRecords(ids).slice(0,3),href:`https://ared.design/community/reading-lists/${encodeURIComponent(list.id)}`};
        }).filter(list => list.count > 0)});
      }
      else if (action === "onboarding-config") response = NextResponse.json({config:onboardingConfig,groups:interestGroups()});
      else if (action === "taxonomy") response = NextResponse.json({ taxonomy: loadCatalogueTaxonomy() });
      else if (action === "record") {
        const record = getCatalogueRecord(q.get("id") || "");
        response = record && allowed(record) ? NextResponse.json({ item: hydrate(record) }) : NextResponse.json({ error: "Record unavailable" }, { status: 404 });
      } else {
        const page = Math.min(500, Math.max(1, Number(q.get("page")) || 1));
        const result = filterCatalogueRecords({ q: (q.get("q") || "").slice(0, 200), region: q.get("region") || undefined, recordType: q.get("recordType") || undefined, periodId: q.get("periodId") || undefined, visualSystemId: q.get("visualSystemId") || undefined, page, limit: 36, sort: "title" });
        const canonical = result.items.filter(allowed).map(hydrate);
        if (action === "explore" && !q.get("periodId") && !q.get("visualSystemId") && !q.get("region") && !q.get("recordType")) {
          const text = (q.get("q") || "").slice(0, 200);
          // Featured: daily selection by publication date (lib/home/featured.ts). The date override is for
          // local simulation only; production always uses today's date.
          const day = process.env.NODE_ENV !== "production" && /^\d{4}-\d{2}-\d{2}$/.test(q.get("featuredDate") || "") ? q.get("featuredDate")! : featuredDate();
          const more = Math.max(0, Math.min(20, Number(q.get("more")) || 0));
          const seenIds = (q.get("seen") || "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 400);
          const discovery = await getExplorePage({ page, q: text, seen: seenIds, seed:(q.get("seed") || "").slice(0,100), day, more }).catch(() => ({items: [], next: null, sourceStatus: "External discovery temporarily unavailable"}));
          let canonical = result.items.filter(allowed).map(hydrate);
          let catalogueNext = page * result.limit < result.total;
          if (!text) {
            // Previously `sort: "title"`: page 1 was always the same first 36 records alphabetically.
            const pool = loadCatalogueRecords().filter(allowed);
            const { main, rest } = featuredOrder(pool.map((r) => ({ id: r.id, region: r.region, periodId: r.periodId, recordType: r.recordType, visualSystemId: r.visualSystemId, institution: r.institutionOrCollection, record: r })), day, { perDay: 24 });
            const order = [...main, ...rest].map((c) => c.record);
            const seenSet = new Set(seenIds);
            const slice = more > 0
              ? order.filter((r) => !seenSet.has(r.id)).slice(0, 12)
              : page === 1 ? order.slice(0, 24) : order.slice(24 + (page - 2) * 36, 24 + (page - 1) * 36);
            canonical = slice.map(hydrate);
            catalogueNext = more === 0 && 24 + (page - 1) * 36 < order.length;
          }
          // Keep the whole archive, interspersed with the existing multi-provider discovery.
          // This is presentation order, not a new recommendation engine.
          const mixed: typeof canonical = [];
          for (let index=0;index<Math.max(canonical.length,Math.ceil(discovery.items.length/2));index++) {
            if(discovery.items[index*2]) mixed.push(discovery.items[index*2]);
            if(canonical[index]) mixed.push(canonical[index]);
            if(discovery.items[index*2+1]) mixed.push(discovery.items[index*2+1]);
          }
          const items = [...new Map(mixed.map(item => [item.id, item])).values()];
          response = NextResponse.json({ ...discovery, items, totalArchiveRecords: result.total, archiveRecordsOnPage: canonical.length, nextPage: catalogueNext ? page + 1 : discovery.next && discovery.next > page ? discovery.next : null, page });
          response.headers.set("Cache-Control", "private, no-store");
          return response;
        }
        // Authority-restricted records are never returned to public discovery.
        response = NextResponse.json({ items: result.items.filter(allowed).map(hydrate), nextPage: page * result.limit < result.total ? page + 1 : null, totalArchiveRecords: result.total, page });
      }
    }
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  });
}
export const GET = dispatch;
export const POST = dispatch;
export const DELETE = dispatch;

export const PATCH = dispatch;
