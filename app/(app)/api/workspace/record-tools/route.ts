import { NextResponse, type NextRequest } from "next/server";
import { getCurrentProfile } from "@/src/lib/auth";
import { createClient } from "@/src/lib/supabase/server";

type WorkspaceAction =
  | "bookmark"
  | "save_search"
  | "create_reading_list"
  | "add_to_reading_list"
  | "submit_content"
  | "workbench_add_record"
  | "workbench_create_project";

function clean(value: unknown, fallback = "") {
  return String(value ?? fallback).trim();
}

function firstText(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function asPlainObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function extractYear(value: unknown) {
  const text = firstText(value);
  if (!text) return "";
  return text.match(/\b(1[5-9]\d{2}|20\d{2}|21\d{2})\b/)?.[0] ?? text;
}

function buildRecordSnapshot(
  body: Record<string, unknown>,
  recordId: string,
  recordTitle: string,
  recordUrl: string,
) {
  const nestedRecord = asPlainObject(body.record);
  const nestedMetadata = asPlainObject(body.metadata);
  const incomingRecord = Object.keys(nestedRecord).length
    ? nestedRecord
    : Object.keys(nestedMetadata).length
      ? nestedMetadata
      : body;
  const incomingMetadata = asPlainObject(incomingRecord.metadata);

  const title =
    firstText(
      incomingRecord.title,
      incomingRecord.name,
      incomingRecord.recordTitle,
      incomingRecord.display_title,
      incomingRecord.displayTitle,
      incomingRecord.record_title,
      incomingMetadata.title,
      body.recordTitle,
      recordTitle,
    ) || null;

  const author =
    firstText(
      incomingRecord.author,
      incomingRecord.creator,
      incomingRecord.contributor,
      incomingRecord.record_author,
      incomingMetadata.author,
      incomingMetadata.creator,
      incomingMetadata.contributor,
    ) || null;

  const source =
    firstText(
      incomingRecord.source,
      incomingRecord.source_name,
      incomingRecord.publisher,
      incomingRecord.archive,
      incomingRecord.collection,
      incomingRecord.record_source,
      incomingMetadata.source,
      incomingMetadata.publisher,
    ) || null;

  const sourceUrl =
    firstText(
      incomingRecord.url,
      incomingRecord.source_url,
      incomingRecord.sourceUrl,
      incomingRecord.recordUrl,
      incomingRecord.href,
      incomingRecord.record_source_url,
      incomingMetadata.url,
      incomingMetadata.source_url,
      body.recordUrl,
      recordUrl,
    ) || null;

  const type =
    firstText(
      incomingRecord.type,
      incomingRecord.record_type,
      incomingRecord.kind,
      incomingRecord.recordType,
      incomingMetadata.type,
    ) || null;

  const year =
    extractYear(
      firstText(
        incomingRecord.year,
        incomingRecord.date,
        incomingRecord.published_at,
        incomingRecord.created_at,
        incomingRecord.record_year,
        incomingMetadata.year,
        incomingMetadata.date,
      ),
    ) || null;

  return {
    record_title: title,
    record_author: author,
    record_source: source,
    record_source_url: sourceUrl,
    record_type: type,
    record_year: year,
    record_metadata: {
      ...incomingMetadata,
      ...incomingRecord,
      id: firstText(incomingRecord.id, recordId),
      title: title ?? undefined,
      author: author ?? undefined,
      source: source ?? undefined,
      source_url: sourceUrl ?? undefined,
      type: type ?? undefined,
      year: year ?? undefined,
    },
  };
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
    const [bookmarksResult, readingListsResult, workbenchResult] = await Promise.all([
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
      supabase
        .from("workbench_projects")
        .select("id, title, updated_at")
        .order("updated_at", { ascending: false })
        .limit(200),
    ]);

    if (bookmarksResult.error) return jsonError(bookmarksResult.error.message, 500);
    if (readingListsResult.error) return jsonError(readingListsResult.error.message, 500);
    if (workbenchResult.error) {
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
        workbenchProjects: [],
        workbenchProjectsError: workbenchResult.error.message,
      });
    }

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
      workbenchProjects: workbenchResult.data ?? [],
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
  const recordTitle = clean(body.recordTitle, "");
  const recordUrl = clean(body.recordUrl) || recordId;
  const recordSnapshot = buildRecordSnapshot(body, recordId, recordTitle, recordUrl);

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
          record_title: recordTitle || null,
          record_source: recordSnapshot.record_source || null,
          record_source_url: recordSnapshot.record_source_url || null,
          record_type: recordSnapshot.record_type || null,
          record_year: recordSnapshot.record_year || null,
          record_metadata: recordSnapshot.record_metadata || null,
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
        ...recordSnapshot,
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
        ...recordSnapshot,
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

  if (action === "workbench_add_record") {
    const projectId = clean(body.projectId);
    if (!projectId) return jsonError("Choose a Workbench project.");

    const { error } = await supabase.from("workbench_project_records").upsert(
      {
        project_id: projectId,
        record_id: recordId,
        status: "to_review",
      },
      { onConflict: "project_id,record_id" },
    );
    if (error) return jsonError(error.message, 500);

    return NextResponse.json({
      ok: true,
      message: "Record added to Workbench project.",
    });
  }

  if (action === "workbench_create_project") {
    const title = clean(body.workbenchTitle);
    if (!title) return jsonError("Project title is required.");

    const { data: project, error: pErr } = await supabase
      .from("workbench_projects")
      .insert({
        owner_id: profile.id,
        title,
        project_type: clean(body.project_type) || "custom_project",
      })
      .select("id, title")
      .single();

    if (pErr || !project) return jsonError(pErr?.message ?? "Could not create project.", 500);

    const { error: rErr } = await supabase.from("workbench_project_records").upsert(
      {
        project_id: project.id,
        record_id: recordId,
        status: "to_review",
      },
      { onConflict: "project_id,record_id" },
    );
    if (rErr) return jsonError(rErr.message, 500);

    return NextResponse.json({
      ok: true,
      message: "Workbench project created and record linked.",
      workbenchProject: project,
    });
  }

  return jsonError("Unknown workspace action.");
}
