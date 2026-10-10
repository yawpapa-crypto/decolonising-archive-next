import { trackPhotoUse } from "@/lib/media/unsplash";
import { NextResponse } from "next/server";
import { createClient, hasSupabaseServerConfig } from "@/src/lib/supabase/server";
import { trackWorkbenchActivity } from "@/lib/workbench-activity-actions";

export const dynamic = "force-dynamic";

interface SaveBody {
  id: string;
  title?: string;
  source?: string;
  type?: string;
  year?: string;
  href?: string;
  image?: string;
  downloadLocation?: string;
  collectionSlug?: string;
  listId?: string;
  unsave?: boolean;
  quick?: boolean;
  undoToken?: string;
}

/**
 * Same tables and columns as the existing Save actions (bookmarks, reading_list_items),
 * without the redirect, so a save can happen in place. Row-level security still applies.
 */
export async function POST(request: Request) {
  if (!hasSupabaseServerConfig()) return NextResponse.json({ error: "Accounts are temporarily unavailable. Please try again later." }, { status: 503 });
  const b = (await request.json().catch(() => null)) as SaveBody | null;
  if (!b?.id) return NextResponse.json({ error: "Missing record." }, { status: 400 });
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return NextResponse.json({ error: "Sign in to save." }, { status: 401 });

  if (b.unsave && b.listId) {
    // Remove from one collection only; the bookmark and other collections are untouched.
    const { data: list } = await supabase.from("reading_lists").select("id").eq("id", b.listId).eq("user_id", user.id).maybeSingle();
    if (!list) return NextResponse.json({ error: "That collection could not be found." }, { status: 404 });
    const { error } = await supabase.from("reading_list_items").delete().eq("reading_list_id", b.listId).eq("record_id", b.id);
    if (error) return NextResponse.json({ error: "Could not remove the record from this collection." }, { status: 500 });
    return NextResponse.json({ ok: true, saved: false, listId: b.listId });
  }

  if (b.unsave) {
    let removal = supabase.from("bookmarks").delete().eq("user_id", user.id).eq("record_id", b.id);
    if (b.undoToken) removal = removal.eq("created_at", b.undoToken.slice(0,100));
    const { error } = await removal;
    if (error) return NextResponse.json({ error: "Could not remove the saved record. Please try again." }, { status: 500 });
    return NextResponse.json({ ok: true, saved: false });
  }

  if (b.source === "Unsplash" && b.downloadLocation && !await trackPhotoUse(b.downloadLocation)) {
    return NextResponse.json({ error: "Photo use could not be registered. Please try again." }, { status: 503 });
  }

  const metadata = {
    normalizedType: b.type || undefined,
    normalizedSource: b.source || undefined,
    sourceLabel: b.source || undefined,
    collectionSlug: b.collectionSlug || undefined,
    image: b.image || undefined,
    savedFrom: "for-you",
  };
  const snapshot = {
    record_title: (b.title ?? "").slice(0, 400) || null,
    record_source: (b.source ?? "").slice(0, 200) || null,
    record_source_url: b.href && /^https?:/.test(b.href) ? b.href : null,
    record_type: (b.type ?? "").slice(0, 80) || null,
    record_year: (b.year ?? "").slice(0, 12) || null,
    record_metadata: metadata,
  };

  if (b.quick && !b.listId) {
    const { data: inserted, error: quickError } = await supabase.from("bookmarks").upsert({ user_id: user.id, record_id: b.id, ...snapshot }, { onConflict: "user_id,record_id", ignoreDuplicates: true }).select("created_at");
    if (quickError) return NextResponse.json({error:"Could not save the record. Please try again."},{status:500});
    const undoToken = inserted?.[0]?.created_at;
    if (undoToken) void trackWorkbenchActivity({eventType:"record_saved",entityType:"record",entityId:b.id,metadata:{record_title:b.title}});
    return NextResponse.json({ok:true,saved:true,alreadySaved:!undoToken,undoToken});
  }

  const { error } = await supabase.from("bookmarks").upsert({ user_id: user.id, record_id: b.id, ...snapshot }, { onConflict: "user_id,record_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (b.listId) {
    const { data: list } = await supabase.from("reading_lists").select("id").eq("id", b.listId).eq("user_id", user.id).maybeSingle();
    if (list) {
      const { count } = await supabase.from("reading_list_items").select("id", { count: "exact", head: true }).eq("reading_list_id", b.listId);
      const { error: collectionError } = await supabase.from("reading_list_items").upsert(
        { reading_list_id: b.listId, record_id: b.id, position: count ?? 0, ...snapshot },
        { onConflict: "reading_list_id,record_id" },
      );
      if (collectionError) return NextResponse.json({ error: "Record saved, but it could not be added to this collection. Try again.", saved: true }, { status: 500 });
      void trackWorkbenchActivity({ eventType: "record_added_to_reading_list", entityType: "reading_list_item", entityId: b.id, metadata: { reading_list_id: b.listId } });
    } else {
      return NextResponse.json({ error: "Record saved, but that collection could not be found. Refresh and try again.", saved: true }, { status: 404 });
    }
  }
  void trackWorkbenchActivity({ eventType: "record_saved", entityType: "record", entityId: b.id, metadata: { record_title: b.title } });
  return NextResponse.json({ ok: true, saved: true });
}
