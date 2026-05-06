import { createClient } from "@/src/lib/supabase/server";

export type MemberNavSummary = {
  bookmarksCount: number;
  readingListsCount: number;
  notificationsCount: number;
};

const EMPTY: MemberNavSummary = {
  bookmarksCount: 0,
  readingListsCount: 0,
  notificationsCount: 0,
};

/**
 * Lightweight counts for the global header. Fails safe with zeros (no thrown errors).
 * Notifications: no persistence table yet — always 0 until wired.
 */
export async function getMemberNavSummary(
  profileId: string,
): Promise<MemberNavSummary> {
  if (!profileId?.trim()) {
    return { ...EMPTY };
  }

  try {
    const supabase = await createClient();
    const [bookmarksResult, listsResult] = await Promise.all([
      supabase
        .from("bookmarks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profileId),
      supabase
        .from("reading_lists")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profileId),
    ]);

    return {
      bookmarksCount: bookmarksResult.error ? 0 : bookmarksResult.count ?? 0,
      readingListsCount: listsResult.error ? 0 : listsResult.count ?? 0,
      notificationsCount: 0,
    };
  } catch {
    return { ...EMPTY };
  }
}
