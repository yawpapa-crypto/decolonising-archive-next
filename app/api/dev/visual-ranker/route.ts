import { NextResponse } from "next/server";
import { getExplorePage } from "@/lib/home/for-you";
import * as forYou from "@/lib/home/for-you";
import { forYouTrace } from "@/lib/recommendations/server";

export const dynamic = "force-dynamic";

/** Dev-only: GET /api/dev/visual-ranker?mode=explore|foryou&q=ghana — per-item composition trace. */
export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") return new NextResponse("Not found", { status: 404 });
  const u = new URL(req.url);
  const mode = u.searchParams.get("mode") === "foryou" ? "foryou" : "explore";
  const q = u.searchParams.get("q") || "";
  const t0 = Date.now();
  if (mode === "explore") {
    const page = await getExplorePage({ page: Number(u.searchParams.get("page") || 1), q, seen: [] });
    return NextResponse.json({ mode, ms: Date.now() - t0, count: page.items.length, trace: forYou.exploreTrace });
  }
  const page = await forYou.getForYouPage({ page: Number(u.searchParams.get("page") || 1), seed: u.searchParams.get("seed") || "dev", seen: [], session: [] });
  return NextResponse.json({ mode, ms: Date.now() - t0, count: page.items.length, trace: forYouTrace });
}
