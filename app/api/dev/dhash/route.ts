import { NextResponse } from "next/server";
import { warmHashes, liveEntry } from "@/lib/visual/live-hash";
import { indexEntry } from "@/lib/visual/index-store";

export const dynamic = "force-dynamic";

/** Dev-only audit: POST {urls} → perceptual hash per URL, so feed repeats can be measured. */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") return new NextResponse("Not found", { status: 404 });
  const { urls = [] } = (await req.json().catch(() => ({}))) as { urls?: string[] };
  await warmHashes(urls, 15000, 16);
  return NextResponse.json(Object.fromEntries(urls.map((u) => [u, (indexEntry(u) ?? liveEntry(u))?.dhash ?? null])));
}

/** GET ?collection=slug → the records a Following collection/canvas would show (dev audit). */
export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") return new NextResponse("Not found", { status: 404 });
  const { collectionRecords } = await import("@/lib/following/ared");
  const slug = new URL(req.url).searchParams.get("collection") || "african-archives";
  const items = await collectionRecords(slug);
  return NextResponse.json(items.map((i) => ({ id: i.id, title: i.title, image: i.image })));
}
