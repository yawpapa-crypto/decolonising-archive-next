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
  record_title: string | null;
  record_author: string | null;
  record_source: string | null;
  record_source_url: string | null;
  record_type: string | null;
  record_year: string | null;
  record_metadata: Record<string, unknown> | null;
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
  const record = recordsById.get(recordId) as
    | (ArchiveRecord & Record<string, unknown>)
    | undefined;
  const metadata = asRecord(record?.metadata);
  const data = asRecord(record?.data);
  const raw = asRecord(record?.raw);

  return (
    firstWorkspaceText(
      record?.title,
      record?.name,
      record?.label,
      record?.display_title,
      record?.displayTitle,
      record?.record_title,
      record?.recordTitle,
      record?.source_title,
      record?.sourceTitle,
      metadata.title,
      data.title,
      raw.title,
    ) || `Archive record ${recordId}`
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function firstWorkspaceText(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
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
        .select(
          "id, reading_list_id, record_id, record_title, record_author, record_source, record_source_url, record_type, record_year, record_metadata, note, added_at",
        )
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
