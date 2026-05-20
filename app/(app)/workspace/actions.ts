"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { readRecords } from "@/lib/records";
import { requireMember } from "@/src/lib/auth";
import { trackWorkbenchActivity } from "@/lib/workbench-activity-actions";
import { createClient } from "@/src/lib/supabase/server";
import { normalizeSavedRecord } from "@/src/lib/saved-record-normalization";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function optionalText(formData: FormData, key: string) {
  const value = text(formData, key);
  return value || null;
}

function redirectTarget(formData: FormData) {
  return text(formData, "redirectTo") || "/workspace";
}

function readingListGroupType(formData: FormData) {
  const value = text(formData, "group_type") || "theme";
  return [
    "project",
    "theme",
    "source_type",
    "media_type",
    "course_research_paper",
  ].includes(value)
    ? value
    : "theme";
}

function isMissingReadingListGroupingError(error: { message?: string } | null) {
  return Boolean(error?.message?.includes("reading_lists.group_"));
}

function fail(message: string, redirectTo = "/workspace"): never {
  redirect(`${redirectTo}?error=${encodeURIComponent(message)}`);
}

function done(message: string, redirectTo = "/workspace"): never {
  redirect(`${redirectTo}?updated=${encodeURIComponent(message)}`);
}

export async function createBookmark(formData: FormData) {
  const profile = await requireMember();
  const redirectTo = redirectTarget(formData);
  const recordId = text(formData, "record_id");
  const note = text(formData, "note");
  const recordTitle = optionalText(formData, "record_title");
  const recordSource = optionalText(formData, "record_source");
  const recordSourceUrl = optionalText(formData, "record_source_url");
  const recordType = optionalText(formData, "record_type");
  const recordYear = optionalText(formData, "record_year");

  if (!recordId) fail("Choose a record to bookmark.", redirectTo);

  const supabase = await createClient();
  const { error } = await supabase.from("bookmarks").upsert(
    {
      user_id: profile.id,
      record_id: recordId,
      record_title: recordTitle,
      record_source: recordSource,
      record_source_url: recordSourceUrl,
      record_type: recordType,
      record_year: recordYear,
      record_metadata: {
        normalizedType: recordType || undefined,
        normalizedSource: recordSource || undefined,
        sourceLabel: recordSource || undefined,
      },
      note: note || null,
    },
    { onConflict: "user_id,record_id" },
  );

  if (error) fail(error.message, redirectTo);
  void trackWorkbenchActivity({
    eventType: "record_saved",
    entityType: "record",
    entityId: recordId,
    metadata: { record_title: recordTitle },
  });
  revalidatePath(redirectTo);
  done("Bookmark saved.", redirectTo);
}

export async function deleteBookmark(formData: FormData) {
  const profile = await requireMember();
  const redirectTo = redirectTarget(formData);
  const id = text(formData, "id");
  const confirm = text(formData, "confirm");
  if (!id) fail("Bookmark not found.", redirectTo);
  if (confirm !== "yes") fail("Confirmation required.", redirectTo);

  const supabase = await createClient();
  const { error } = await supabase
    .from("bookmarks")
    .delete()
    .eq("id", id)
    .eq("user_id", profile.id);

  if (error) fail(error.message, redirectTo);
  revalidatePath(redirectTo);
  done("Bookmark removed.", redirectTo);
}

export async function updateBookmark(formData: FormData) {
  const profile = await requireMember();
  const redirectTo = redirectTarget(formData);
  const id = text(formData, "id");
  const note = text(formData, "note");
  if (!id) fail("Bookmark not found.", redirectTo);

  const supabase = await createClient();
  const { error } = await supabase
    .from("bookmarks")
    .update({ note: note || null })
    .eq("id", id)
    .eq("user_id", profile.id);

  if (error) fail(error.message, redirectTo);
  revalidatePath(redirectTo);
  done("Bookmark updated.", redirectTo);
}

export async function deleteReadingList(formData: FormData) {
  const profile = await requireMember();
  const redirectTo = redirectTarget(formData);
  const id = text(formData, "id");
  const confirm = text(formData, "confirm");
  if (!id) fail("Reading list not found.", redirectTo);
  if (confirm !== "yes") fail("Confirmation required.", redirectTo);

  const supabase = await createClient();
  const { error: itemsError } = await supabase
    .from("reading_list_items")
    .delete()
    .eq("reading_list_id", id);
  if (itemsError) fail(itemsError.message, redirectTo);

  const { error } = await supabase
    .from("reading_lists")
    .delete()
    .eq("id", id)
    .eq("user_id", profile.id);

  if (error) fail(error.message, redirectTo);
  revalidatePath(redirectTo);
  done("Reading list deleted.", redirectTo);
}

export async function updateReadingList(formData: FormData) {
  const profile = await requireMember();
  const redirectTo = redirectTarget(formData);
  const id = text(formData, "id");
  const title = text(formData, "title");
  const description = text(formData, "description");
  const groupType = readingListGroupType(formData);
  const groupLabel = text(formData, "group_label");
  const isPublic = formData.get("is_public") === "on";

  if (!id) fail("Reading list not found.", redirectTo);
  if (!title) fail("Reading list title is required.", redirectTo);

  const supabase = await createClient();
  let { error } = await supabase
    .from("reading_lists")
    .update({
      title,
      description: description || null,
      group_type: groupType,
      group_label: groupLabel || null,
      is_public: isPublic,
    })
    .eq("id", id)
    .eq("user_id", profile.id);

  if (isMissingReadingListGroupingError(error)) {
    const fallback = await supabase
      .from("reading_lists")
      .update({ title, description: description || null, is_public: isPublic })
      .eq("id", id)
      .eq("user_id", profile.id);
    error = fallback.error;
  }

  if (error) fail(error.message, redirectTo);
  revalidatePath(redirectTo);
  done("Reading list updated.", redirectTo);
}

async function addBookmarkSnapshotToReadingList(
  bookmarkId: string,
  readingListId: string,
  profileId: string,
  redirectTo: string,
) {
  const supabase = await createClient();
  const { data: list, error: listError } = await supabase
    .from("reading_lists")
    .select("id")
    .eq("id", readingListId)
    .eq("user_id", profileId)
    .maybeSingle();

  if (listError) fail(listError.message, redirectTo);
  if (!list) fail("Reading list not found.", redirectTo);

  const { data: bookmark, error: bookmarkError } = await supabase
    .from("bookmarks")
    .select(
      "id, record_id, record_title, record_source, record_source_url, record_type, record_year, record_metadata, note, created_at",
    )
    .eq("id", bookmarkId)
    .eq("user_id", profileId)
    .maybeSingle();

  if (bookmarkError) fail(bookmarkError.message, redirectTo);
  if (!bookmark) fail("Bookmark not found.", redirectTo);

  const { count } = await supabase
    .from("reading_list_items")
    .select("id", { count: "exact", head: true })
    .eq("reading_list_id", readingListId);

  const metadata =
    bookmark.record_metadata && typeof bookmark.record_metadata === "object"
      ? (bookmark.record_metadata as Record<string, unknown>)
      : {};
  const normalized = normalizeSavedRecord(bookmark);

  const { error } = await supabase.from("reading_list_items").upsert(
    {
      reading_list_id: readingListId,
      record_id: bookmark.record_id,
      position: count ?? 0,
      record_title: bookmark.record_title,
      record_author: normalized.authorLabel || null,
      record_source: bookmark.record_source,
      record_source_url: bookmark.record_source_url,
      record_type: bookmark.record_type || normalized.typeLabel,
      record_year: bookmark.record_year || (normalized.year ? String(normalized.year) : null),
      record_metadata: {
        ...metadata,
        normalizedType: normalized.normalizedType,
        normalizedSource: normalized.normalizedSource,
        mediaTypes: normalized.mediaTypes,
        sourceLabel: normalized.sourceLabel,
      },
      note: bookmark.note,
    },
    { onConflict: "reading_list_id,record_id" },
  );

  if (error) fail(error.message, redirectTo);

  return bookmark;
}

export async function addBookmarkToReadingList(formData: FormData) {
  const profile = await requireMember();
  const redirectTo = redirectTarget(formData);
  const bookmarkId = text(formData, "bookmark_id");
  const readingListId = text(formData, "reading_list_id");

  if (!bookmarkId || !readingListId) {
    fail("Choose a saved record and reading list.", redirectTo);
  }

  const bookmark = await addBookmarkSnapshotToReadingList(
    bookmarkId,
    readingListId,
    profile.id,
    redirectTo,
  );

  void trackWorkbenchActivity({
    eventType: "record_added_to_reading_list",
    entityType: "reading_list_item",
    entityId: bookmark.record_id,
    metadata: { reading_list_id: readingListId },
  });
  revalidatePath(redirectTo);
  revalidatePath("/my/lists");
  done("Saved record added to reading list.", redirectTo);
}

export async function moveBookmarkToReadingList(formData: FormData) {
  const profile = await requireMember();
  const redirectTo = redirectTarget(formData);
  const bookmarkId = text(formData, "bookmark_id");
  const readingListId = text(formData, "reading_list_id");

  if (!bookmarkId || !readingListId) {
    fail("Choose a saved record and reading list.", redirectTo);
  }

  const bookmark = await addBookmarkSnapshotToReadingList(
    bookmarkId,
    readingListId,
    profile.id,
    redirectTo,
  );

  const supabase = await createClient();
  const { error } = await supabase
    .from("bookmarks")
    .delete()
    .eq("id", bookmarkId)
    .eq("user_id", profile.id);

  if (error) fail(error.message, redirectTo);

  void trackWorkbenchActivity({
    eventType: "record_added_to_reading_list",
    entityType: "reading_list_item",
    entityId: bookmark.record_id,
    metadata: { reading_list_id: readingListId, moved_from_bookmarks: true },
  });
  revalidatePath(redirectTo);
  revalidatePath("/my/lists");
  done("Saved record moved to reading list.", redirectTo);
}

export async function deleteReadingListItem(formData: FormData) {
  await requireMember();
  const redirectTo = redirectTarget(formData);
  const id = text(formData, "id");
  if (!id) fail("Reading list item not found.", redirectTo);

  const supabase = await createClient();
  const { error } = await supabase
    .from("reading_list_items")
    .delete()
    .eq("id", id);

  if (error) fail(error.message, redirectTo);
  revalidatePath(redirectTo);
  done("Removed record from list.", redirectTo);
}

export async function createSavedSearch(formData: FormData) {
  const profile = await requireMember();
  const redirectTo = redirectTarget(formData);
  const query = text(formData, "query");
  const label = text(formData, "label") || query;

  if (!query) fail("Enter a search query to save.", redirectTo);

  const supabase = await createClient();
  const { data, error } = await supabase.from("saved_searches").insert({
    user_id: profile.id,
    label,
    query,
    filters: {},
  }).select("id").single();

  if (error) fail(error.message, redirectTo);
  void trackWorkbenchActivity({
    eventType: "search_saved",
    entityType: "search",
    entityId: data?.id ?? query,
    metadata: { label, query },
  });
  revalidatePath(redirectTo);
  done("Search saved.", redirectTo);
}

export async function deleteSavedSearch(formData: FormData) {
  const profile = await requireMember();
  const redirectTo = redirectTarget(formData);
  const id = text(formData, "id");
  const confirm = text(formData, "confirm");
  if (!id) fail("Saved search not found.", redirectTo);
  if (confirm !== "yes") fail("Confirmation required.", redirectTo);

  const supabase = await createClient();
  const { error } = await supabase
    .from("saved_searches")
    .delete()
    .eq("id", id)
    .eq("user_id", profile.id);

  if (error) fail(error.message, redirectTo);
  revalidatePath(redirectTo);
  done("Saved search removed.", redirectTo);
}

export async function updateSavedSearch(formData: FormData) {
  const profile = await requireMember();
  const redirectTo = redirectTarget(formData);
  const id = text(formData, "id");
  const label = text(formData, "label");
  const query = text(formData, "query");

  if (!id) fail("Saved search not found.", redirectTo);
  if (!query) fail("Saved search query is required.", redirectTo);

  const supabase = await createClient();
  const { error } = await supabase
    .from("saved_searches")
    .update({ label: label || query, query })
    .eq("id", id)
    .eq("user_id", profile.id);

  if (error) fail(error.message, redirectTo);
  revalidatePath(redirectTo);
  done("Saved search updated.", redirectTo);
}

export async function createReadingList(formData: FormData) {
  const profile = await requireMember();
  const redirectTo = redirectTarget(formData);
  const title = text(formData, "title");
  const description = text(formData, "description");
  const groupType = readingListGroupType(formData);
  const groupLabel = text(formData, "group_label");
  const isPublic = formData.get("is_public") === "on";

  if (!title) fail("Give the reading list a title.", redirectTo);

  const supabase = await createClient();
  let { error } = await supabase.from("reading_lists").insert({
    user_id: profile.id,
    title,
    description: description || null,
    group_type: groupType,
    group_label: groupLabel || null,
    is_public: isPublic,
  });

  if (isMissingReadingListGroupingError(error)) {
    const fallback = await supabase.from("reading_lists").insert({
      user_id: profile.id,
      title,
      description: description || null,
      is_public: isPublic,
    });
    error = fallback.error;
  }

  if (error) fail(error.message, redirectTo);
  revalidatePath(redirectTo);
  done("Reading list created.", redirectTo);
}

export async function addRecordToReadingList(formData: FormData) {
  const profile = await requireMember();
  const redirectTo = redirectTarget(formData);
  const readingListId = text(formData, "reading_list_id");
  const recordId = text(formData, "record_id");

  if (!readingListId || !recordId) {
    fail("Choose a reading list and record.", redirectTo);
  }

  const supabase = await createClient();
  const { data: list, error: listError } = await supabase
    .from("reading_lists")
    .select("id")
    .eq("id", readingListId)
    .eq("user_id", profile.id)
    .maybeSingle();

  if (listError) fail(listError.message, redirectTo);
  if (!list) fail("Reading list not found.", redirectTo);

  const { count } = await supabase
    .from("reading_list_items")
    .select("id", { count: "exact", head: true })
    .eq("reading_list_id", readingListId);
  const record = (await readRecords()).find((item) => item.id === recordId);

  const { error } = await supabase.from("reading_list_items").upsert(
    {
      reading_list_id: readingListId,
      record_id: recordId,
      position: count ?? 0,
      record_title: record?.title ?? null,
      record_author: record?.creator ?? null,
      record_source: record?.source ?? record?.collection ?? null,
      record_source_url: record?.sourceUrl ?? null,
      record_type: record?.type ?? null,
      record_year: null,
      record_metadata: record ?? {},
    },
    { onConflict: "reading_list_id,record_id" },
  );

  if (error) fail(error.message, redirectTo);
  void trackWorkbenchActivity({
    eventType: "record_added_to_reading_list",
    entityType: "reading_list_item",
    entityId: recordId,
    metadata: { reading_list_id: readingListId },
  });
  revalidatePath(redirectTo);
  done("Record added to reading list.", redirectTo);
}

export async function submitContent(formData: FormData) {
  const profile = await requireMember();
  const redirectTo = redirectTarget(formData);
  const title = text(formData, "title");
  const contentType = text(formData, "content_type") || "record";
  const description = text(formData, "description");
  const sourceUrl = text(formData, "source_url");

  if (!title || !description) {
    fail("Submitted content needs a title and description.", redirectTo);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("submitted_content").insert({
    user_id: profile.id,
    title,
    content_type: contentType,
    description,
    source_url: sourceUrl || null,
  });

  if (error) fail(error.message, redirectTo);
  revalidatePath(redirectTo);
  done("Content submitted for curator review.", redirectTo);
}

export async function submitSupportRequest(formData: FormData) {
  await requireMember();
  const category = text(formData, "category");
  const subject = text(formData, "subject");
  const message = text(formData, "message");

  if (!category || !subject || !message) {
    fail("Support request needs category, subject, and message.");
  }

  // TODO: Persist support requests when a support_requests table/API is available.
  done("Support request captured. We'll wire delivery next.");
}
