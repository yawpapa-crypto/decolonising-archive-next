import { requireMember } from "@/src/lib/auth";
import { createClient } from "@/src/lib/supabase/server";
import { readRecords, type ArchiveRecord } from "@/lib/records";

export type BookmarkRow = {
  id: string;
  record_id: string;
  note: string | null;
  created_at: string;
};

export type SavedSearchRow = {
  id: string;
  label: string;
  query: string;
  created_at: string;
};

export type ReadingListRow = {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
};

export type ReadingListItemRow = {
  id: string;
  reading_list_id: string;
  record_id: string;
  note: string | null;
  added_at: string;
};

export function formatWorkspaceDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

export function workspaceRecordTitle(
  recordsById: Map<string, ArchiveRecord>,
  recordId: string,
) {
  return recordsById.get(recordId)?.title ?? recordId;
}

export async function getMemberWorkspaceData(next = "/workspace") {
  const profile = await requireMember(next);
  const supabase = await createClient();
  const records = (await readRecords()).filter((record) => record.published);
  const recordsById = new Map(records.map((record) => [record.id, record]));

  const [bookmarksResult, savedSearchesResult, readingListsResult] =
    await Promise.all([
      supabase
        .from("bookmarks")
        .select("id, record_id, note, created_at")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("saved_searches")
        .select("id, label, query, created_at")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("reading_lists")
        .select("id, title, description, is_public, created_at")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false }),
    ]);

  const readingLists = (readingListsResult.data ?? []) as ReadingListRow[];
  const listIds = readingLists.map((list) => list.id);
  const readingListItemsResult = listIds.length
    ? await supabase
        .from("reading_list_items")
        .select("id, reading_list_id, record_id, note, added_at")
        .in("reading_list_id", listIds)
        .order("added_at", { ascending: false })
    : { data: [], error: null };

  if (bookmarksResult.error) throw new Error(bookmarksResult.error.message);
  if (savedSearchesResult.error) throw new Error(savedSearchesResult.error.message);
  if (readingListsResult.error) throw new Error(readingListsResult.error.message);
  if (readingListItemsResult.error) {
    throw new Error(readingListItemsResult.error.message);
  }

  return {
    profile,
    records,
    recordsById,
    bookmarks: (bookmarksResult.data ?? []) as BookmarkRow[],
    savedSearches: (savedSearchesResult.data ?? []) as SavedSearchRow[],
    readingLists,
    readingListItems: (readingListItemsResult.data ?? []) as ReadingListItemRow[],
  };
}
