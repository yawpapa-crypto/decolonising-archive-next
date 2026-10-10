import { NextResponse } from "next/server";
import { getHomeCollage } from "@/lib/home/home-collage";

/**
 * Diagnostics for the glocal homepage image feed. Open /api/home-collage to see
 * which upstream sources answered and how many images each contributed.
 * Never exposes API keys.
 */
export async function GET() {
  const collage = await getHomeCollage();
  const bySource: Record<string, number> = {};
  for (const tile of collage.global) {
    const key = tile.source.split(" · ")[0];
    bySource[key] = (bySource[key] ?? 0) + 1;
  }
  return NextResponse.json({
    live: collage.live,
    usedFallback: collage.usedFallback,
    counts: { local: collage.local.length, global: collage.global.length, bySource },
    sample: collage.global.slice(0, 5).map((t) => ({ title: t.title, source: t.source, src: t.src })),
  });
}
