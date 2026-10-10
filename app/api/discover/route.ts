import { NextResponse } from "next/server";
import { DISCOVER_TYPES, getDiscoverPage, type DiscoverType } from "@/lib/home/discover";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const t = sp.get("type") as DiscoverType | null;
  const type = t && DISCOVER_TYPES.includes(t) ? t : "all";
  const page = Math.min(500, Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1));
  const data = await getDiscoverPage({ page, type, q: sp.get("q") ?? "" });
  return NextResponse.json(data, { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" } });
}
