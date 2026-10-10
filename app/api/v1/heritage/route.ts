import { NextResponse } from "next/server";
import { heritageDetail, heritageInBounds, heritageSearch, parseBounds } from "@/lib/heritage/world-heritage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * UNESCO World Heritage layer (ared.design-owned).
 *   GET ?bbox=w,s,e,n&zoom=  → properties / verified components in view
 *   GET ?id=unesco-wh-34      → property detail with components and official link
 *   GET ?q=forts and castles  → property name search (all official languages)
 */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const headers = { "Cache-Control": "public, max-age=3600" };
  const id = (q.get("id") ?? "").slice(0, 120);
  if (id) {
    const detail = heritageDetail(id);
    return detail ? NextResponse.json(detail, { headers }) : NextResponse.json({ error: "World Heritage property not found" }, { status: 404 });
  }
  const term = (q.get("q") ?? "").slice(0, 120);
  if (term) return NextResponse.json({ results: heritageSearch(term) }, { headers });
  const bounds = parseBounds(q.get("bbox"));
  if (!bounds) return NextResponse.json({ error: "bbox=west,south,east,north is required" }, { status: 400 });
  const zoom = Math.min(22, Math.max(0, Number(q.get("zoom")) || 3));
  return NextResponse.json(heritageInBounds(bounds, zoom), { headers });
}
