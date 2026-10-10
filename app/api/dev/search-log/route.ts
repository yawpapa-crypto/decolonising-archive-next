import { NextResponse } from "next/server";
import { getSupabase } from "@/src/lib/supabase";

export const dynamic = "force-dynamic";

/** Dev-only audit: the latest logged searches, read with the service role. */
export async function GET() {
  if (process.env.NODE_ENV === "production") return new NextResponse("Not found", { status: 404 });
  const { data, error, count } = await getSupabase().from("search_events").select("query, source_scope, result_count, status, created_at", { count: "exact" }).order("created_at", { ascending: false }).limit(15);
  return NextResponse.json({ error: error?.message ?? null, total: count, latest: data });
}

/** Dev-only: remove rows written by a QA run (exact query match). */
export async function DELETE(req: Request) {
  if (process.env.NODE_ENV === "production") return new NextResponse("Not found", { status: 404 });
  const q = new URL(req.url).searchParams.get("q");
  if (!q) return NextResponse.json({ error: "q required" }, { status: 400 });
  const a = await getSupabase().from("search_events").delete().eq("query", q);
  const b = await getSupabase().from("user_activity_events").delete().eq("query", q);
  return NextResponse.json({ error: a.error?.message ?? b.error?.message ?? null });
}
