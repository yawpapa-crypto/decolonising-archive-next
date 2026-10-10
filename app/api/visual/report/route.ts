import { NextResponse } from "next/server";
import { markFailed } from "@/lib/visual/describe";

export const dynamic = "force-dynamic";

/** Browsers report an image that failed to load; the feed then stops requesting that URL for a day. */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { url?: string };
  const url = String(b.url || "").slice(0, 600);
  if (/^https:\/\//.test(url)) markFailed(url);
  return new NextResponse(null, { status: 204 });
}
