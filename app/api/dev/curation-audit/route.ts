import { NextResponse } from "next/server";
import { getSupabase } from "@/src/lib/supabase";

export const dynamic = "force-dynamic";

/** Dev-only audit: every public profile and public collection a visitor can be shown. */
export async function GET() {
  if (process.env.NODE_ENV === "production") return new NextResponse("Not found", { status: 404 });
  const db = getSupabase();
  const [p, l] = await Promise.all([
    db.from("profiles").select("id, display_name, username, profile_visibility, created_at").eq("profile_visibility", "public").limit(200),
    db.from("reading_lists").select("id, title, user_id, is_public, created_at").eq("is_public", true).limit(200),
  ]);
  return NextResponse.json({ profiles: p.data, profileError: p.error?.message, lists: l.data, listError: l.error?.message });
}

/** POST: which of the pending migration objects already exist. */
export async function POST() {
  if (process.env.NODE_ENV === "production") return new NextResponse("Not found", { status: 404 });
  const db = getSupabase();
  const out: Record<string, string> = {};
  for (const t of ["curatorial_follows", "curatorial_activity", "visual_assets"]) {
    const r = await db.from(t).select("*", { head: true, count: "exact" });
    out[t] = r.error ? `missing: ${r.error.message}` : `exists (${r.count} rows)`;
  }
  const rpc = await db.rpc("curatorial_public_records", { collection_ids: [] });
  out.curatorial_public_records = rpc.error ? `missing: ${rpc.error.message}` : "exists";
  return NextResponse.json(out);
}
