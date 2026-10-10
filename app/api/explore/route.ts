import { NextResponse } from "next/server";
import { getExplorePage } from "@/lib/home/for-you";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const b = (await request.json().catch(() => ({}))) as { page?: number; q?: string; seen?: string[] };
  const clean = (s: unknown) => String(s ?? "").slice(0, 160);
  const data = await getExplorePage({
    page: Math.min(500, Math.max(1, Math.floor(Number(b.page) || 1))),
    q: clean(b.q),
    seen: Array.isArray(b.seen) ? b.seen.slice(-1800).map(clean) : [],
  });
  return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
}
