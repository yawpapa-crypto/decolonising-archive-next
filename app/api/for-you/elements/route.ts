import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Everything the member has saved, newest first. */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return NextResponse.json({ loggedIn: false, items: [] }, { status: 401 });
    const { data } = await supabase
      .from("bookmarks")
      .select("record_id, record_title, record_source, record_source_url, record_type, record_year, record_metadata, created_at")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(500);
    return NextResponse.json({ loggedIn: true, items: data ?? [] });
  } catch {
    return NextResponse.json({ loggedIn: false, items: [], error: "Could not load saved records." }, { status: 500 });
  }
}
