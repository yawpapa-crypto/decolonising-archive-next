import { NextResponse } from "next/server";
import { getSimilarPage } from "@/lib/home/for-you";

import { publicKnowledgeGraph } from "@/lib/knowledge/server";
import { connectedRecords } from "@/lib/knowledge/model";
import { publicRecords } from "@/lib/following/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const b = (await request.json().catch(() => ({}))) as { item?: { id?: string; title?: string; authors?: string; venue?: string; source?: string }; page?: number; seen?: string[] };
  const clean = (s: unknown) => String(s ?? "").slice(0, 200);
  if (!b.item?.id || !b.item.title) return NextResponse.json({ items: [], next: null, streams: {} });
  const data = await getSimilarPage({
    item: { id: clean(b.item.id), title: clean(b.item.title), authors: clean(b.item.authors), venue: clean(b.item.venue), source: clean(b.item.source) },
    page: Math.max(1, Math.floor(Number(b.page) || 1)),
    seen: Array.isArray(b.seen) ? b.seen.slice(-1800).map(clean) : [],
  });
  if ((Number(b.page)||1)===1) {
    const connections=connectedRecords(await publicKnowledgeGraph(),clean(b.item.id),12);
    const excluded=new Set(b.seen??[]);
    const explicit=publicRecords(connections.map(c=>c.id)).filter(i=>!excluded.has(i.id)).map(i=>({...i,why:connections.find(c=>c.id===i.id)?.reasons.join(" · ")}));
    const ids=new Set(explicit.map(i=>i.id));
    data.items=[...explicit,...data.items.filter(i=>!ids.has(i.id))];
  }
  return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
}
