import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { visibleReadingLists, type ReadingListRow } from "@/src/lib/member-workspace";

export const dynamic = "force-dynamic";

/** The member's real collections (reading lists), with item counts. */
export async function GET(request: Request) {
  // Optional ?recordId= lets the app's "Save to" sheet show where a record already is.
  const recordId = new URL(request.url).searchParams.get("recordId")?.slice(0, 300) || null;
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return NextResponse.json({ loggedIn: false, lists: [] });
    const { data: lists, error: listError } = await supabase.from("reading_lists").select("id, title, description, is_public, created_at").eq("user_id", auth.user.id).order("created_at", { ascending: false });
    if (listError) throw listError;
    const ids = (lists ?? []).map((l: { id: string }) => l.id);
    const counts = new Map<string, number>();
    const covers = new Map<string, string>();
    let memberships: Array<{ reading_list_id: string; record_id: string }> = [];
    if (ids.length) {
      const { data: items, error: itemError } = await supabase.from("reading_list_items").select("reading_list_id, record_id, record_metadata, position").in("reading_list_id", ids).order("position", { ascending: false });
      if (itemError) throw itemError;
      memberships = items ?? [];
      for (const i of (items ?? []) as Array<{ reading_list_id: string; record_metadata?: { image?: string } | null }>) {
        counts.set(i.reading_list_id, (counts.get(i.reading_list_id) ?? 0) + 1);
        const img = i.record_metadata?.image;
        // The most recently added picture becomes the collection's cover.
        if (img && !covers.has(i.reading_list_id) && /^(https?:\/\/|\/)/.test(img)) covers.set(i.reading_list_id, img);
      }
    }
    let bookmarked = false;
    if (recordId) {
      const { data: mark } = await supabase.from("bookmarks").select("record_id").eq("user_id", auth.user.id).eq("record_id", recordId).maybeSingle();
      bookmarked = Boolean(mark);
    }
    return NextResponse.json({
      loggedIn: true,
      ...(recordId ? { bookmarked } : {}),
      lists: visibleReadingLists((lists ?? []) as ReadingListRow[], memberships).map((l: { id: string; title: string }) => ({ id: l.id, title: l.title, count: counts.get(l.id) ?? 0, cover: covers.get(l.id) ?? null, ...(recordId ? { contains: memberships.some(m => m.reading_list_id === l.id && m.record_id === recordId) } : {}) })),
    });
  } catch {
    return NextResponse.json({ error: "Could not load collections." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const { title, description, isPublic } = (await request.json().catch(() => ({}))) as { title?: string; description?: string; isPublic?: boolean };
  const name = String(title ?? "").trim().slice(0, 120);
  if (!name) return NextResponse.json({ error: "Give the collection a title." }, { status: 400 });
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Sign in to create a collection." }, { status: 401 });
  const { data, error } = await supabase.from("reading_lists").insert({ user_id: auth.user.id, title: name, description: String(description ?? "").trim().slice(0, 500) || null, is_public: isPublic === true }).select("id, title").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ list: { id: data.id, title: data.title, count: 0, cover: null } });
}
