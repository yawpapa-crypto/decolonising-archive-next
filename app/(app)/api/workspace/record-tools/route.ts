import { NextResponse, type NextRequest } from "next/server";
import { getCurrentProfile } from "@/src/lib/auth";
import { createClient } from "@/src/lib/supabase/server";

type WorkspaceAction =
  | "bookmark"
  | "save_search"
  | "create_reading_list"
  | "add_to_reading_list"
  | "submit_content";

function clean(value: unknown, fallback = "") {
  return String(value ?? fallback).trim();
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ ok: true, authenticated: false });
  }

  const mode = clean(request.nextUrl.searchParams.get("mode"));
  if (mode === "session") {
    const supabase = await createClient();
    const [bookmarksResult, readingListsResult] = await Promise.all([
      supabase
        .from("bookmarks")
        .select("record_id, created_at")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("reading_lists")
        .select("id, title, description, is_public, created_at")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false }),
    ]);

    if (bookmarksResult.error) return jsonError(bookmarksResult.error.message, 500);
    if (readingListsResult.error) return jsonError(readingListsResult.error.message, 500);

    return NextResponse.json({
      ok: true,
      authenticated: true,
      profile: {
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
      },
      bookmarkRecordIds: (bookmarksResult.data ?? []).map((item) => item.record_id),
      readingLists: readingListsResult.data ?? [],
    });
  }

  const recordId = clean(request.nextUrl.searchParams.get("recordId"));
  const recordUrl = clean(request.nextUrl.searchParams.get("recordUrl")) || recordId;
  if (!recordId) return jsonError("Missing recordId.");

  const supabase = await createClient();
  const [bookmarkResult, readingListsResult, submissionsResult] =
    await Promise.all([
      supabase
        .from("bookmarks")
        .select("id, note, created_at")
        .eq("user_id", profile.id)
        .eq("record_id", recordId)
        .maybeSingle(),
      supabase
        .from("reading_lists")
        .select("id, title, description, is_public, created_at")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("submitted_content")
        .select("id, title, content_type, review_status, created_at")
        .eq("user_id", profile.id)
        .eq("source_url", recordUrl)
        .order("created_at", { ascending: false }),
    ]);

  if (bookmarkResult.error) return jsonError(bookmarkResult.error.message, 500);
  if (readingListsResult.error) {
    return jsonError(readingListsResult.error.message, 500);
  }
  if (submissionsResult.error) return jsonError(submissionsResult.error.message, 500);

  return NextResponse.json({
    ok: true,
    authenticated: true,
    profile: {
      email: profile.email,
      full_name: profile.full_name,
      role: profile.role,
    },
    bookmark: bookmarkResult.data ?? null,
    readingLists: readingListsResult.data ?? [],
    submissions: submissionsResult.data ?? [],
  });
}

export async function POST(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) return jsonError("Sign in required.", 401);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Invalid JSON body.");
  }
  const action = clean(body.action) as WorkspaceAction;
  const recordId = clean(body.recordId);
  const recordTitle = clean(body.recordTitle, "Archive record");
  const recordUrl = clean(body.recordUrl) || recordId;

  if (action !== "save_search" && !recordId) return jsonError("Missing recordId.");

  const supabase = await createClient();

  if (action === "bookmark") {
    const shouldBookmark =
      typeof body.bookmarked === "boolean" ? body.bookmarked : true;

    if (shouldBookmark) {
      const { error } = await supabase.from("bookmarks").upsert(
        {
          user_id: profile.id,
          record_id: recordId,
          note: clean(body.note) || null,
        },
        { onConflict: "user_id,record_id" },
      );
      if (error) return jsonError(error.message, 500);
      return NextResponse.json({
        ok: true,
        bookmarked: true,
        message: "Bookmark saved.",
      });
    }

    const { error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("user_id", profile.id)
      .eq("record_id", recordId);
    if (error) return jsonError(error.message, 500);

    return NextResponse.json({
      ok: true,
      bookmarked: false,
      message: "Bookmark removed.",
    });
  }

  if (action === "save_search") {
    const query = clean(body.query) || recordTitle;
    if (!query) return jsonError("Search query is required.");
    const { error } = await supabase.from("saved_searches").insert({
      user_id: profile.id,
      label: clean(body.label) || query,
      query,
      filters: body.filters && typeof body.filters === "object"
        ? body.filters
        : { source: "record_detail", recordId },
    });
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ ok: true, message: "Search saved." });
  }

  if (action === "create_reading_list") {
    const title = clean(body.title);
    if (!title) return jsonError("Reading list title is required.");

    const { data: list, error: listError } = await supabase
      .from("reading_lists")
      .insert({
        user_id: profile.id,
        title,
        description: clean(body.description) || null,
        is_public: Boolean(body.isPublic),
      })
      .select("id, title, description, is_public, created_at")
      .single();

    if (listError) return jsonError(listError.message, 500);

    const { error: itemError } = await supabase.from("reading_list_items").upsert(
      {
        reading_list_id: list.id,
        record_id: recordId,
        position: 0,
        note: clean(body.note) || null,
      },
      { onConflict: "reading_list_id,record_id" },
    );
    if (itemError) return jsonError(itemError.message, 500);

    return NextResponse.json({
      ok: true,
      message: "Reading list created and record added.",
      readingList: list,
    });
  }

  if (action === "add_to_reading_list") {
    const readingListId = clean(body.readingListId);
    if (!readingListId) return jsonError("Choose a reading list.");

    const { data: list, error: listError } = await supabase
      .from("reading_lists")
      .select("id")
      .eq("id", readingListId)
      .eq("user_id", profile.id)
      .maybeSingle();

    if (listError) return jsonError(listError.message, 500);
    if (!list) return jsonError("Reading list not found.", 404);

    const { count } = await supabase
      .from("reading_list_items")
      .select("id", { count: "exact", head: true })
      .eq("reading_list_id", readingListId);

    const { error } = await supabase.from("reading_list_items").upsert(
      {
        reading_list_id: readingListId,
        record_id: recordId,
        position: count ?? 0,
        note: clean(body.note) || null,
      },
      { onConflict: "reading_list_id,record_id" },
    );
    if (error) return jsonError(error.message, 500);

    return NextResponse.json({ ok: true, message: "Record added to reading list." });
  }

  if (action === "submit_content") {
    const description = clean(body.description);
    if (!description) return jsonError("Add a note for curators.");

    const { error } = await supabase.from("submitted_content").insert({
      user_id: profile.id,
      title: clean(body.title) || `Note on ${recordTitle}`,
      content_type: clean(body.contentType, "community_note"),
      description,
      source_url: recordUrl,
    });
    if (error) return jsonError(error.message, 500);

    return NextResponse.json({
      ok: true,
      message: "Sent to curator review.",
    });
  }

  return jsonError("Unknown workspace action.");
}
